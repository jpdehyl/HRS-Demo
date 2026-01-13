import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

export const requireRole = (...allowedRoles: string[]) => {
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
