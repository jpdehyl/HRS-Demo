# Support Chat Agent Guide

> **Feature:** AI-Powered Support Chat Widget
> **Version:** 2.0
> **Last Updated:** January 11, 2026

The Support Chat is an AI-powered assistant that helps you get answers to platform questions, troubleshoot issues, and learn best practices—all without leaving your current workflow.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Role-Based Access](#role-based-access)
4. [Auto-Populate Features](#auto-populate-features)
5. [Performance & Product Knowledge](#performance--product-knowledge)
6. [Use Cases by Role](#use-cases-by-role)
7. [Example Conversations](#example-conversations)
8. [Tips for Better Responses](#tips-for-better-responses)
9. [Limitations](#limitations)

---

## Overview

### What is the Support Chat?

The Support Chat is a floating AI assistant available on every page of Lead Intel. It's designed to:

- Answer questions about platform features
- Guide you through common tasks
- Help troubleshoot issues
- Provide best practices for sales workflows

### Key Features

| Feature | Description |
|---------|-------------|
| **Always Available** | Floating button in the bottom-right corner of every page |
| **Context-Aware** | Knows which page you're on and your role |
| **Conversation Memory** | Remembers your chat history within the session |
| **Quick Topics** | Pre-built questions for common topics |
| **Mobile Friendly** | Works seamlessly on phones and tablets |

---

## Getting Started

### Opening the Chat

1. Look for the **chat bubble** icon in the bottom-right corner of any page
2. Click the bubble to open the chat window
3. Type your question or click a suggested topic

### Basic Interaction

```
You: How do I research a lead?

Support: To research a lead in Lead Intel:

1. Navigate to the **Leads** page
2. Find the lead you want to research
3. Click the **Research** button on the lead card
4. Wait 30-60 seconds for the AI to gather intelligence
5. View the research dossier with company intel, pain points, and talk tracks

The research pulls data from the company website, LinkedIn, and other sources to give you a comprehensive pre-call brief.
```

### Closing the Chat

- Click the **X** button in the chat window header
- Click the chat bubble again
- Your conversation history is saved automatically

---

## Role-Based Access

The Support Chat automatically adapts to your role, showing relevant information and capabilities.

### Role-Specific Experiences

| Role | Data Access | Special Features |
|------|-------------|------------------|
| **SDR** | Own leads, calls, metrics | Product recommendations, call tips, BANT guidance |
| **Manager** | Team metrics, all SDR data | Team performance, coaching frameworks, SDR comparisons |
| **Admin** | All system data | Integration troubleshooting, user management help |
| **Account Executive** | Handed-off leads | Handoff context, lead history |

### What SDRs Can Ask About

- Your personal leads and pipeline
- Your call history and metrics
- Performance benchmarks for your experience level
- Product recommendations for prospects
- BANT qualification guidance
- Best practices for discovery calls

### What Managers Can Ask About (In Addition to SDR Features)

- **Team metrics**: "Show team performance" or "Team stats"
- **SDR comparisons**: "Who is my top performer?"
- **Coaching tips**: "How should I coach an SDR on discovery?"
- **7-dimensional call scoring**: Understanding and using AI call analysis
- **Benchmarks by experience**: Performance targets for new vs experienced SDRs

### Manager View Indicator

When logged in as a Manager or Admin, the chat header displays a "Manager View" badge indicating you have access to team-level data.

---

## Auto-Populate Features

The Support Chat can automatically fetch and display your real data from Lead Intel. This makes it easy to see your leads, calls, and stats without navigating away from your current page.

### Quick Action Buttons

When you open the chat, you'll see three quick action buttons:

| Button | What It Does |
|--------|--------------|
| **My Leads** | Fetches and displays your assigned leads with status, fit score, and follow-up dates |
| **My Calls** | Shows your recent call history with duration and disposition |
| **My Stats** | Displays your performance metrics (leads, calls today, calls this week) |

### Trigger Phrases

You can also type natural language phrases to trigger data fetching:

**For Leads:**
- "Show my leads"
- "List my leads"
- "What leads do I have?"
- "View my assigned leads"

**For Calls:**
- "Show my recent calls"
- "My call history"
- "Calls today"

**For Stats:**
- "How am I doing?"
- "My performance"
- "Show my stats"
- "My metrics"

### Interactive Lead Cards

When leads are displayed, they appear as clickable cards showing:

- **Company Name** - The lead's company
- **Contact Name** - Your primary contact
- **Status Badge** - Color-coded status (new, contacted, qualified, etc.)
- **Fit Score** - AI-calculated fit percentage
- **Next Follow-up** - When you should reach out next

**Click any lead card** to navigate directly to the Call Prep page for that lead.

### Example: Viewing Your Leads

```
You: Show my leads

Support: Here are your currently assigned leads. I can see you have
12 leads total, with 3 new ones this week. Click any lead below to
view their full profile and prepare for a call.

[Stats Cards showing: 12 Leads (+3 this week) | 5 Calls Today (18 this week)]

[Lead Card] Acme Corp - John Smith
            Status: qualified | Fit: 85%
            Follow-up: 1/12/2026

[Lead Card] TechStart Inc - Sarah Jones
            Status: new | Fit: 72%

[Lead Card] Global Manufacturing - Mike Brown
            Status: contacted | Fit: 68%
            Follow-up: 1/13/2026

[View All →]
```

### Stats Overview

When you ask for stats, you'll see:

- **Total Leads** - All leads currently assigned to you
- **Leads This Week** - New leads added in the current week
- **Calls Today** - Number of calls you've made today
- **Calls This Week** - Total calls for the current week

This gives you a quick snapshot of your activity without opening the dashboard.

---

## Performance & Product Knowledge

The Support Chat includes built-in knowledge about performance metrics and Hawk Ridge products.

### Performance Metrics Help

Ask the chat about metrics and benchmarks:

**SDR Performance Questions:**
- "What's a good connection rate?"
- "How many calls should I make per day?"
- "What are the benchmarks for my experience level?"
- "How is qualification rate calculated?"

**Manager Performance Questions:**
- "What are good benchmarks by SDR experience?"
- "What red flags should I look for in call reviews?"
- "How should I coach someone with low connection rate?"

### Performance Benchmarks

The chat knows industry benchmarks:

| Experience Level | Calls/Day | Connection Rate | Qualification Rate |
|-----------------|-----------|-----------------|-------------------|
| New (0-6 months) | 40-60 | 15% | 15% |
| Experienced (6-18 months) | 60-80 | 20% | 25% |
| Top Performer (18+ months) | 80+ | 25%+ | 30%+ |

### Product Knowledge

The chat can help with Hawk Ridge product recommendations:

**Product Questions:**
- "What products solve design challenges?"
- "Which SOLIDWORKS version is best for small teams?"
- "What should I recommend for a manufacturing company?"
- "When should I suggest simulation tools?"

**Example:**
```
You: I have a prospect in aerospace who mentioned compliance issues

Support: For aerospace companies with compliance concerns, consider:

1. **SOLIDWORKS PDM Professional** - Addresses version control and
   regulatory compliance (FDA, AS9100 requirements)
2. **SOLIDWORKS Premium** - Includes simulation for design validation
3. **3DEXPERIENCE Platform** - For multi-site collaboration if needed

Key pain points to explore:
- Are they struggling with audit trails?
- Do they need revision control across teams?
- What's their current file management approach?
```

### 7-Dimensional Call Scoring (Managers)

Understand the AI call analysis dimensions:

1. **Opening/Rapport** - Credibility and connection
2. **Discovery** - Uncovering pain points
3. **Value Proposition** - Articulating benefits
4. **Objection Handling** - Addressing concerns
5. **Next Steps** - Securing commitments
6. **Talk/Listen Ratio** - Balance (30/70 ideal)
7. **Overall Effectiveness** - Achieving objectives

### Manager-Only: Team Data Display

When managers ask about team performance, they see:

- **Team Overview Cards**: Total leads, calls, qualified leads
- **Top Performer**: Who's leading this week
- **SDR Performance Cards**: Per-SDR metrics including:
  - Calls this week
  - Total leads
  - Qualified leads
  - Connection rate
  - Achievement badges (award icon for 20%+ connection rate)

### Example: Manager Viewing Team Stats

```
Manager: Show team performance

Support: Here's your team's performance this week. You have 5 SDRs
with 156 total leads. Sarah Johnson is your top performer with
45 calls this week.

[Team Overview Cards]
156 Team Leads (23 qualified) | 287 Team Calls (Top: Sarah Johnson)

[SDR Performance Cards]
1. Sarah Johnson
   Calls/Week: 45 | Leads: 38
   Qualified: 8 | Connect %: 24% 🏆

2. Mike Chen
   Calls/Week: 42 | Leads: 35
   Qualified: 6 | Connect %: 21% 🏆

3. Emily Davis
   Calls/Week: 38 | Leads: 32
   Qualified: 5 | Connect %: 18%
```

---

## Use Cases by Role

### For SDRs (Sales Development Representatives)

The Support Chat is your personal assistant for day-to-day sales activities.

#### 1. Learning Platform Features

**When to use:** You're new to Lead Intel or exploring a feature you haven't used before.

**Example questions:**
- "How do I use the power dialer?"
- "What does the live coaching feature do?"
- "How do I add a new lead manually?"

#### 2. Pre-Call Preparation

**When to use:** You're about to make a call and want quick guidance.

**Example questions:**
- "What should I look for in a research dossier?"
- "How do I use the talk track suggestions?"
- "What are good discovery questions for a manufacturing company?"

#### 3. Troubleshooting Call Issues

**When to use:** Something isn't working during or after a call.

**Example questions:**
- "My transcription isn't showing up"
- "The call didn't record, what do I do?"
- "How do I reconnect if a call drops?"

#### 4. Understanding Your Metrics

**When to use:** You want to know how you're performing.

**Example questions:**
- "What metrics should I focus on as an SDR?"
- "How is my fit score calculated?"
- "What does the 7-dimensional call scoring mean?"

#### 5. CRM Sync Questions

**When to use:** You need to sync data with Salesforce.

**Example questions:**
- "How do I push a lead to Salesforce?"
- "Why isn't my lead syncing?"
- "How do I import leads from Salesforce?"

---

### For Managers

The Support Chat helps you understand team performance and platform capabilities.

#### 1. Team Oversight Features

**When to use:** You want to monitor and coach your team.

**Example questions:**
- "How do I review my team's calls?"
- "Where can I see team performance metrics?"
- "How do I leave coaching notes on a call?"

#### 2. Understanding Analytics

**When to use:** You're reviewing reports or dashboards.

**Example questions:**
- "What does the conversion rate metric include?"
- "How is the team leaderboard calculated?"
- "What's a good benchmark for calls per day?"

#### 3. Coaching Best Practices

**When to use:** You want to improve how you coach your SDRs.

**Example questions:**
- "What should I look for when reviewing a call?"
- "How can I use the AI analysis to coach better?"
- "What are signs of a good discovery call?"

#### 4. Configuration Questions

**When to use:** You need to set up or adjust team settings.

**Example questions:**
- "How do I add a new SDR to my team?"
- "Can I customize the call disposition options?"
- "How do I set up Salesforce integration for my team?"

#### 5. Handoff Process

**When to use:** Managing lead handoffs to Account Executives.

**Example questions:**
- "How does the AE handoff process work?"
- "What information gets sent to the AE?"
- "How do I track handed-off leads?"

---

## Example Conversations

### Example 1: SDR Learning Lead Research

```
SDR: How do I research a lead before a call?

Support: Great question! Here's how to research a lead:

1. Go to the **Leads** page
2. Find your lead and click **Research**
3. Wait 30-60 seconds for the AI analysis
4. Review the dossier which includes:
   - Company overview and recent news
   - Contact's LinkedIn insights
   - Pain points relevant to our products
   - Suggested talk tracks
   - Discovery questions

**Pro tip:** Research at least 5 minutes before your call so you have time to review the insights.

SDR: What if the research fails?

Support: If research fails, try these steps:

1. **Check the website URL** - Make sure it's valid and accessible
2. **Verify the company name** - Ensure it's spelled correctly
3. **Try again** - Sometimes external sources are temporarily unavailable
4. **Use partial data** - Even if some sources fail, you may get useful info from others

If issues persist, the lead may have limited online presence. You can still make the call using basic information.
```

### Example 2: SDR Troubleshooting Call Quality

```
SDR: My calls keep having audio issues, what should I do?

Support: Audio issues are usually related to your connection or browser. Try these fixes:

**Quick fixes:**
- Refresh the page
- Check your internet connection
- Make sure your microphone is selected correctly in browser settings
- Close other tabs using audio/video

**Browser settings:**
1. Click the lock icon in your browser's address bar
2. Ensure microphone permission is "Allow"
3. Check that the correct microphone is selected

**If issues continue:**
- Try a different browser (Chrome works best)
- Use a headset instead of built-in speakers
- Move closer to your WiFi router

Still having problems? Contact support@hawkridge.com with details about when the issue occurs.
```

### Example 3: Manager Reviewing Team Performance

```
Manager: How do I see which SDRs are performing best this week?

Support: You can view team performance in several ways:

**Team Dashboard:**
1. Go to **Team** in the sidebar
2. View the leaderboard showing calls, conversions, and talk time
3. Click any SDR to see their detailed metrics

**Reports Page:**
1. Go to **Reports** (Manager/Admin only)
2. Select the date range (this week)
3. Compare metrics across your team:
   - Calls made
   - Connection rate
   - Average call duration
   - Qualification rate

**Quick insights:**
- Green indicators = above team average
- Red indicators = needs attention
- Click any metric to drill down

Would you like tips on coaching underperforming SDRs?

Manager: Yes, how should I approach coaching?

Support: Here's a coaching framework that works well:

**1. Review calls together**
- Pick 2-3 calls (one good, one to improve)
- Use the AI analysis as a starting point
- Ask the SDR what they think went well/poorly first

**2. Focus on one thing at a time**
- Don't overwhelm with feedback
- Pick the highest-impact improvement
- Set a specific goal for the next week

**3. Use the platform tools**
- Leave coaching notes on specific calls
- Reference the AI-suggested improvements
- Track progress in their metrics over time

**4. Celebrate wins**
- Acknowledge improvements publicly
- Share successful call recordings as examples
- Recognize effort, not just results
```

### Example 4: Manager Understanding Salesforce Sync

```
Manager: How does the Salesforce integration work?

Support: Lead Intel integrates with Salesforce to keep your data in sync. Here's how it works:

**What syncs:**
- Lead information (name, company, contact details)
- Call activities and notes
- Lead status changes
- Handoff information to AEs

**Sync directions:**
1. **Import from Salesforce** - Pull leads into Lead Intel
2. **Push to Salesforce** - Update Salesforce with Lead Intel data
3. **Handoff to AE** - Transfer qualified leads with full context

**Setup:**
1. Go to **Settings**
2. Find **Integrations** section
3. Click **Connect Salesforce**
4. Authorize with your Salesforce credentials

**Important:** You need Salesforce admin permissions to set up the initial connection.

Want me to explain any specific sync scenario?
```

### Example 5: SDR Handling a Qualified Lead

```
SDR: I just had a great call and the lead is qualified. What do I do next?

Support: Congratulations on qualifying a lead! Here's your checklist:

**Immediately after the call:**
1. Complete the **Post-Call Summary**
   - Select disposition: "Qualified"
   - Add key takeaways
   - Note next steps discussed

2. Review the **AI Analysis**
   - Check the BANT extraction
   - Verify the qualification criteria
   - Add any missing context

**Handoff to AE:**
1. Go to the lead's detail page
2. Click **Hand Off to AE**
3. Select the Account Executive
4. Review the handoff summary
5. Add any personal notes for the AE
6. Click **Send Handoff**

**The AE will receive:**
- Full call recording and transcript
- AI-generated summary
- Research dossier
- Your personal notes
- BANT qualification details

**Pro tip:** The better your notes, the smoother the AE's follow-up will be!
```

---

## Tips for Better Responses

### Be Specific

```
❌ "Help with calls"
✅ "How do I see the transcript during a live call?"
```

### Provide Context

```
❌ "It's not working"
✅ "The research button is grayed out on the leads page"
```

### Ask Follow-Up Questions

The chat remembers your conversation, so you can ask follow-ups:

```
You: How do I use the coaching panel?
Support: [explains coaching panel]
You: What if I don't see any suggestions appearing?
Support: [troubleshoots based on previous context]
```

### Use Quick Topics

When you open the chat, you'll see suggested topics like:
- "Lead research"
- "Call features"
- "Salesforce sync"

Click these for common starting points.

---

## Limitations

The Support Chat is designed to help with platform-related questions. While it can access your role-appropriate data, it **cannot**:

| Cannot Do | Alternative |
|-----------|-------------|
| Make changes to your account or data | Use the appropriate page in the app |
| Access other users' data (SDRs can't see other SDRs) | Managers can see their team's data |
| Access external systems directly | Use the respective integrations |
| Provide real-time call coaching | Use the Live Coaching feature during calls |
| Handle billing or subscription changes | Contact support@hawkridge.com |
| Access data outside your role permissions | Contact your manager or admin |

### When to Contact Human Support

Reach out to **support@hawkridge.com** for:
- Billing and subscription questions
- Account access issues
- Bug reports that the chat can't resolve
- Feature requests
- Enterprise configuration needs

---

## Quick Reference Card

### Common SDR Questions

| Question | Quick Answer |
|----------|--------------|
| "How do I research a lead?" | Leads page → Click Research on lead card |
| "Where are my call recordings?" | Lead detail page → Call History section |
| "How do I add a lead?" | Leads page → Add Lead button |
| "What's my call quota?" | Dashboard → Your Metrics panel |
| "How do I hand off to AE?" | Lead detail → Hand Off to AE button |

### Common Manager Questions

| Question | Quick Answer |
|----------|--------------|
| "Where are team metrics?" | Team page or Reports page |
| "How do I review calls?" | Team page → Click SDR → Call History |
| "How do I add coaching notes?" | Open call recording → Add Coaching Note |
| "Where's the Salesforce setup?" | Settings → Integrations |
| "How do I see handoff status?" | AE Pipeline page |

---

## Feedback

Found the Support Chat helpful? Have suggestions for improvement?

- Use the chat to tell us what worked
- Email feedback to support@hawkridge.com
- Your usage helps us improve the AI responses

---

*The Support Chat uses Claude AI to provide helpful, accurate responses about the Lead Intel platform. Responses are generated based on platform documentation and best practices.*
