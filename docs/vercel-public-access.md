# Public reviewer access on Vercel

Vercel Authentication is enforced before a request reaches Next.js Routing
Middleware. A `middleware.ts` query-token bypass cannot disable that platform
check, and `vercel.json` has no Deployment Protection setting.

For this public assignment demo, disable Vercel Authentication at the project
level:

1. Open **Vercel → TableTalk → Settings → Deployment Protection**.
2. Set the protection level to **None**, or turn off **Vercel Authentication**
   for every environment reviewers must reach.
3. Save. Existing and future deployments for that scope become public.

The equivalent Vercel REST API update is:

```http
PATCH https://api.vercel.com/v9/projects/{project-id-or-name}?teamId={team-id}
Authorization: Bearer {VERCEL_ACCESS_TOKEN}
Content-Type: application/json

{"ssoProtection":null}
```

Do not commit the access token. The caller must be an owner, member, or project
administrator with permission to update Deployment Protection.
