import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole?: string;
  }
}

const MemoryStoreSession = MemoryStore(session);

const SALT_ROUNDS = 12;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      store: new MemoryStoreSession({
        checkPeriod: 86400000,
      }),
      secret: process.env.SESSION_SECRET || "lead-intel-secret-key-change-in-prod",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  const requireRole = (...allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      try {
        const user = await storage.getUser(req.session.userId);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        if (!allowedRoles.includes(user.role)) {
          return res.status(403).json({ message: "Access denied. Insufficient permissions." });
        }

        req.session.userRole = user.role;
        next();
      } catch (error) {
        console.error("Role check error:", error);
        res.status(500).json({ message: "Authorization check failed" });
      }
    };
  };

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(validatedData.password, SALT_ROUNDS);
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      req.session.userId = user.id;
      req.session.userRole = user.role;

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      await storage.updateUserLastLogin(user.id);

      req.session.userId = user.id;
      req.session.userRole = user.role;

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Authentication check failed" });
    }
  });

  app.get("/api/user", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.get("/api/team", requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      res.json({ message: "Team data - admin/manager only", authorized: true });
    } catch (error) {
      console.error("Team fetch error:", error);
      res.status(500).json({ message: "Failed to fetch team data" });
    }
  });

  app.get("/api/reports", requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      res.json({ message: "Reports data - admin/manager only", authorized: true });
    } catch (error) {
      console.error("Reports fetch error:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get("/api/leads", requireAuth, async (req: Request, res: Response) => {
    try {
      res.json({ leads: [], message: "Leads endpoint ready" });
    } catch (error) {
      console.error("Leads fetch error:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  return httpServer;
}
