# Salesforce CRM Integration Guide for Lead Intel

## Technical Documentation for Hawk Ridge Systems IT Department

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Integration Type:** OAuth 2.0 Web Server Flow (Authorization Code Grant)

---

## Table of Contents

1. [Integration Overview](#1-integration-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Prerequisites and Requirements](#3-prerequisites-and-requirements)
4. [Salesforce Connected App Configuration](#4-salesforce-connected-app-configuration)
5. [OAuth 2.0 Authentication Flow](#5-oauth-20-authentication-flow)
6. [Required Credentials](#6-required-credentials)
7. [API Scopes and Permissions](#7-api-scopes-and-permissions)
8. [Data Flow and Field Mapping](#8-data-flow-and-field-mapping)
9. [Security Considerations](#9-security-considerations)
10. [Network and Firewall Requirements](#10-network-and-firewall-requirements)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Integration Overview

Lead Intel integrates with Salesforce CRM to enable bi-directional lead synchronization:

| Direction | Operation | Description |
|-----------|-----------|-------------|
| **Inbound** | Lead Import | Pull leads from Salesforce into Lead Intel for AI research and calling |
| **Outbound** | Push Updates | Sync research insights, qualification notes, and call outcomes back to Salesforce |
| **Outbound** | Handover | Update lead status and ownership when qualified leads are handed to Account Executives |

### Integration Method

The integration uses **Salesforce OAuth 2.0 Web Server Flow** (also known as Authorization Code Grant), which is the recommended method for server-side applications that need to access Salesforce on behalf of an organization.

### Why OAuth 2.0 Web Server Flow?

- **No password storage**: We never store Salesforce user passwords
- **Granular permissions**: Access is limited to specific API scopes
- **Token refresh**: Long-lived access without re-authentication
- **Revocable**: Hawk Ridge IT can revoke access at any time from Salesforce Setup

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Lead Intel Platform                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Express.js Backend                           │    │
│  │  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────┐  │    │
│  │  │  Salesforce      │    │  Token Manager   │    │  Lead Sync    │  │    │
│  │  │  OAuth Client    │◄──►│  (Encrypted DB)  │◄──►│  Service      │  │    │
│  │  └────────┬─────────┘    └──────────────────┘    └───────┬───────┘  │    │
│  │           │                                               │          │    │
│  └───────────┼───────────────────────────────────────────────┼──────────┘    │
│              │                                               │               │
└──────────────┼───────────────────────────────────────────────┼───────────────┘
               │ HTTPS (TLS 1.2+)                              │
               ▼                                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Salesforce Platform                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         Connected App                                    │ │
│  │  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────────┐  │ │
│  │  │  OAuth 2.0       │    │  REST API        │    │  Lead Object      │  │ │
│  │  │  Authorization   │    │  (v58.0+)        │    │  SOQL Queries     │  │ │
│  │  └──────────────────┘    └──────────────────┘    └───────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Prerequisites and Requirements

### Salesforce Edition Requirements

The integration requires a Salesforce edition that supports the REST API:

| Edition | Supported | Notes |
|---------|-----------|-------|
| Enterprise | ✅ Yes | Full API access included |
| Unlimited | ✅ Yes | Full API access included |
| Performance | ✅ Yes | Full API access included |
| Professional | ⚠️ Limited | Requires API add-on purchase |
| Essentials | ❌ No | No API access available |
| Developer | ✅ Yes | For testing/development only |

### Salesforce User Requirements

The Salesforce user who authorizes the connection must have:

- **Profile Permissions:**
  - "API Enabled" permission
  - Read access to the Lead object
  - Edit access to the Lead object (for push/handover operations)
  - Optionally: "Modify All Data" for full access across all leads

- **License Type:**
  - Salesforce Platform license or higher
  - Sales Cloud license (recommended)

### API Limits Consideration

Lead Intel makes REST API calls to Salesforce. Ensure your org has sufficient API call capacity:

| Operation | Estimated API Calls |
|-----------|---------------------|
| Import 100 leads | 2-3 calls (batched SOQL) |
| Push single lead update | 1 call |
| Handover single lead | 1-2 calls |

Monitor your org's API usage at: **Setup → System Overview → API Usage**

---

## 4. Salesforce Connected App Configuration

A Salesforce administrator must create a Connected App to enable the OAuth integration.

### Step-by-Step Setup Instructions

#### Step 1: Navigate to App Manager

1. Log in to Salesforce as an administrator
2. Go to **Setup** (gear icon → Setup)
3. In the Quick Find box, type "App Manager"
4. Click **App Manager**
5. Click **New Connected App** (top right)

#### Step 2: Configure Basic Information

| Field | Value |
|-------|-------|
| **Connected App Name** | Lead Intel Integration |
| **API Name** | Lead_Intel_Integration (auto-populated) |
| **Contact Email** | Your IT admin email |
| **Description** | Integration for Lead Intel sales intelligence platform |

#### Step 3: Enable OAuth Settings

1. Check **Enable OAuth Settings**
2. Configure the following OAuth settings:

| Setting | Value |
|---------|-------|
| **Callback URL** | `https://YOUR_LEAD_INTEL_DOMAIN/api/salesforce/callback` |
| **Selected OAuth Scopes** | See [Section 7](#7-api-scopes-and-permissions) below |
| **Require Proof Key for Code Exchange (PKCE)** | Unchecked (not required) |
| **Require Secret for Web Server Flow** | Checked ✅ |
| **Require Secret for Refresh Token Flow** | Checked ✅ |
| **Enable Client Credentials Flow** | Unchecked |

**Important:** Replace `YOUR_LEAD_INTEL_DOMAIN` with the actual production domain of the Lead Intel application (e.g., `leadintel.hawkridgesystems.replit.app`).

#### Step 4: Configure OAuth Scopes

Add the following OAuth scopes (minimum required):

| Scope | API Value | Purpose |
|-------|-----------|---------|
| **Access and manage your data (api)** | `api` | REST API access for CRUD operations |
| **Perform requests on your behalf at any time (refresh_token, offline_access)** | `refresh_token, offline_access` | Token refresh without re-authentication |
| **Access unique user identifiers (openid)** | `openid` | Identify the connected user |

Optional but recommended:
| Scope | API Value | Purpose |
|-------|-----------|---------|
| **Access your basic information (id, profile)** | `id, profile` | Display connected user info |

#### Step 5: Save and Retrieve Credentials

1. Click **Save**
2. Click **Continue** on the warning dialog
3. Wait 2-10 minutes for Salesforce to activate the Connected App
4. Go back to the Connected App detail page
5. Click **Manage Consumer Details** (you may need to verify identity)
6. Record the following credentials:

```
Consumer Key:    xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Consumer Secret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ CRITICAL SECURITY:** These credentials must be transmitted securely to the Lead Intel platform administrators. Never send via unencrypted email. Use a secure password manager, encrypted file, or direct configuration.

---

## 5. OAuth 2.0 Authentication Flow

The integration uses the standard OAuth 2.0 Authorization Code flow:

```
┌──────────────┐                                    ┌──────────────┐
│  Lead Intel  │                                    │  Salesforce  │
│    Admin     │                                    │   OAuth      │
└──────┬───────┘                                    └──────┬───────┘
       │                                                   │
       │  1. Click "Connect Salesforce"                    │
       │──────────────────────────────────────────────────►│
       │                                                   │
       │  2. Redirect to Salesforce login                  │
       │◄──────────────────────────────────────────────────│
       │                                                   │
       │  3. User logs in & authorizes                     │
       │──────────────────────────────────────────────────►│
       │                                                   │
       │  4. Redirect with authorization code              │
       │◄──────────────────────────────────────────────────│
       │                                                   │
       │  5. Exchange code for tokens (server-to-server)   │
       │──────────────────────────────────────────────────►│
       │                                                   │
       │  6. Return access_token + refresh_token           │
       │◄──────────────────────────────────────────────────│
       │                                                   │
       │  7. Store encrypted tokens in database            │
       │                                                   │
       ▼                                                   ▼
```

### Token Lifecycle

| Token Type | Lifetime | Refresh Mechanism |
|------------|----------|-------------------|
| Access Token | 2 hours (configurable in Salesforce) | Auto-refreshed before expiry |
| Refresh Token | Until revoked (or per session policy) | Used to obtain new access tokens |

---

## 6. Required Credentials

### What Hawk Ridge IT Must Provide

After creating the Connected App, provide the following to Lead Intel administrators:

| Credential | Description | Example Format |
|------------|-------------|----------------|
| **Consumer Key (Client ID)** | Unique identifier for the Connected App | `3MVG9...` (alphanumeric, ~85 chars) |
| **Consumer Secret** | Secret key for token exchange | `B4C8E...` (alphanumeric, ~64 chars) |
| **Salesforce Instance URL** | Your org's login URL | `https://login.salesforce.com` or `https://hawkridge.my.salesforce.com` |

### Credential Storage in Lead Intel

Credentials are stored as encrypted secrets in the Lead Intel platform:

| Secret Name | Value |
|-------------|-------|
| `SALESFORCE_CLIENT_ID` | Consumer Key from Connected App |
| `SALESFORCE_CLIENT_SECRET` | Consumer Secret from Connected App |

OAuth tokens (access_token, refresh_token) are stored in an encrypted database table (`integration_settings`) and are never exposed to client-side code.

---

## 7. API Scopes and Permissions

### Minimum Required Scopes

```
api
refresh_token
offline_access
```

### Scope Details

| Scope | Permission Granted | Why Lead Intel Needs It |
|-------|-------------------|------------------------|
| `api` | Full REST API access | Query and update Lead records |
| `refresh_token` | Obtain refresh tokens | Maintain long-term access without re-auth |
| `offline_access` | Access when user is not present | Automated sync operations |

### Salesforce Object Access

Lead Intel accesses the following Salesforce objects:

| Object | Operations | Fields Accessed |
|--------|------------|-----------------|
| **Lead** | Query, Create, Update | Id, Name, FirstName, LastName, Email, Phone, Company, Title, Industry, Website, Status, Description, LeadSource |
| **User** | Query (read-only) | Id, Name (for owner assignment) |

---

## 8. Data Flow and Field Mapping

### Inbound: Salesforce → Lead Intel

When importing leads from Salesforce:

| Salesforce Field | Lead Intel Field | Data Type | Notes |
|------------------|------------------|-----------|-------|
| `Id` | `salesforceId` | String | Used for sync tracking |
| `FirstName` + `LastName` or `Name` | `contactName` | String | Combined into single field |
| `Email` | `contactEmail` | String | |
| `Phone` | `contactPhone` | String | |
| `Company` | `companyName` | String | |
| `Title` | `contactTitle` | String | |
| `Industry` | `companyIndustry` | String | |
| `Website` | `companyWebsite` | String | |
| `Status` | `status` | Enum | Mapped to Lead Intel status values |
| `Description` | `notes` | Text | |
| `LeadSource` | `source` | String | Prefixed with "Salesforce: " |

### Status Mapping (Inbound)

| Salesforce Status | Lead Intel Status |
|-------------------|-------------------|
| Open - Not Contacted | new |
| Working - Contacted | contacted |
| Closed - Converted | qualified |
| Closed - Not Converted | disqualified |
| (Other) | new |

### Outbound: Lead Intel → Salesforce

When pushing updates or handover:

| Lead Intel Field | Salesforce Field | Operation |
|------------------|------------------|-----------|
| `contactEmail` | `Email` | Update |
| `contactPhone` | `Phone` | Update |
| `status` | `Status` | Update (with reverse mapping) |
| `notes` | `Description` | Append (preserves existing) |
| Research summary | `Description` | Append to existing description |
| Qualification notes | `Description` | Append with timestamp |

---

## 9. Security Considerations

### Data Protection

| Aspect | Implementation |
|--------|----------------|
| **Transport Security** | All API calls use HTTPS with TLS 1.2+ |
| **Token Storage** | Encrypted at rest in PostgreSQL database |
| **Token Transmission** | Server-to-server only, never exposed to browser |
| **Access Control** | Only Lead Intel admin users can configure Salesforce connection |
| **Audit Logging** | All sync operations logged in `salesforce_sync_log` table |

### Credential Security Best Practices

1. **Rotate secrets annually**: Regenerate Consumer Secret in Salesforce yearly
2. **Monitor Connected Apps**: Review at **Setup → Connected Apps OAuth Usage**
3. **IP restrictions**: Optionally restrict the Connected App to Lead Intel server IPs
4. **Session policies**: Configure session timeout in Salesforce org settings

### Revoking Access

To immediately revoke Lead Intel's access to Salesforce:

1. Go to **Setup → App Manager**
2. Find "Lead Intel Integration"
3. Click the dropdown arrow → **Manage**
4. Under "OAuth Policies", click **Revoke All Tokens**

Or for specific users:
1. Go to **Setup → Session Management**
2. Find and revoke specific OAuth sessions

---

## 10. Network and Firewall Requirements

### Outbound Connections from Lead Intel

Lead Intel servers make outbound HTTPS connections to:

| Destination | Port | Purpose |
|-------------|------|---------|
| `login.salesforce.com` | 443 | OAuth authorization and token exchange |
| `*.my.salesforce.com` | 443 | REST API calls (varies by org) |
| `*.salesforce.com` | 443 | API endpoints |

### IP Allowlisting (If Required)

If your Salesforce org has IP restrictions enabled:

1. Determine Lead Intel's egress IP addresses (contact Lead Intel support)
2. Add to **Setup → Network Access** or **Trusted IP Ranges**
3. Or configure the Connected App's "IP Relaxation" setting

### Callback URL Configuration

Ensure the Lead Intel callback URL is accessible:

```
https://YOUR_LEAD_INTEL_DOMAIN/api/salesforce/callback
```

This URL must be:
- Publicly accessible (for OAuth redirect)
- Using HTTPS with valid SSL certificate
- Exactly matching the Callback URL in the Connected App

---

## 11. Troubleshooting

### Common Issues and Solutions

#### "redirect_uri_mismatch" Error

**Cause:** Callback URL in Connected App doesn't match the request

**Solution:**
1. Verify the Callback URL in Salesforce matches exactly
2. Check for trailing slashes
3. Ensure HTTPS (not HTTP)

#### "invalid_client_id" Error

**Cause:** Consumer Key is incorrect or Connected App not yet active

**Solution:**
1. Wait 10 minutes after creating Connected App
2. Verify Consumer Key was copied correctly
3. Check Connected App status is "Enabled"

#### "insufficient_access" Error

**Cause:** Authorizing user lacks required permissions

**Solution:**
1. Verify user has "API Enabled" permission
2. Check user has access to Lead object
3. Review user's profile and permission sets

#### "INVALID_SESSION_ID" Error

**Cause:** Access token expired and refresh failed

**Solution:**
1. Check refresh token is still valid
2. Verify session policies in Salesforce
3. Re-authorize the connection from Lead Intel admin

#### No Leads Imported

**Cause:** SOQL query returned no results

**Solution:**
1. Verify leads exist in Salesforce
2. Check sharing rules for the authorizing user
3. Review any filter criteria applied during import

### Support Contacts

For integration issues, contact:
- **Lead Intel Support:** [Your support email/channel]
- **Salesforce Administrator:** [Hawk Ridge IT contact]

---

## Appendix A: Connected App Quick Reference

```
Connected App Name:     Lead Intel Integration
API Name:               Lead_Intel_Integration
Callback URL:           https://[DOMAIN]/api/salesforce/callback

Required OAuth Scopes:
  - api
  - refresh_token
  - offline_access

Settings:
  - Require Secret for Web Server Flow: ✅
  - Require Secret for Refresh Token Flow: ✅
  - Enable Client Credentials Flow: ❌
```

---

## Appendix B: API Endpoints Reference

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/salesforce/status` | GET | Check connection status | Admin |
| `/api/salesforce/connect` | GET | Initiate OAuth flow | Admin |
| `/api/salesforce/callback` | GET | OAuth callback handler | None (Salesforce redirect) |
| `/api/salesforce/disconnect` | POST | Revoke connection | Admin |
| `/api/salesforce/import` | POST | Import leads from Salesforce | Admin |
| `/api/salesforce/sync-logs` | GET | View sync history | Admin |
| `/api/leads/:id/push-to-salesforce` | POST | Push lead updates | Admin |
| `/api/leads/:id/handover-salesforce` | POST | Handover with Salesforce sync | Admin |

---

*Document prepared for Hawk Ridge Systems IT Department*
