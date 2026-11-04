import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { workspaceUserId } from '@/lib/team/workspace';

export async function verifyAuthOrShare(
  req: Request,
  siteIdOrDomain: string,
  isDomain = false
): Promise<{ userId: string; site: any } | null> {
  const session = await getServerSession(authOptions);
  const loggedInUserId = (session?.user as any)?.id as string | undefined;

  const { searchParams } = new URL(req.url);
  const shareToken = searchParams.get('shareToken') ?? undefined;

  if (shareToken) {
    const site = await prisma.site.findFirst({
      where: {
        shareToken,
        shareEnabled: true,
        ...(isDomain ? { url: siteIdOrDomain } : { id: siteIdOrDomain }),
      },
    });
    if (site) {
      return { userId: site.userId, site };
    }
  }

  if (loggedInUserId) {
    // Sites belong to the workspace owner. A team member's session id owns no sites, so resolve
    // the workspace first (same rule as every workspaceUserId() route); fall back to the session id.
    const ownerId = (await workspaceUserId().catch(() => null)) ?? loggedInUserId;
    const site = await prisma.site.findFirst({
      where: {
        userId: ownerId,
        ...(isDomain ? { url: siteIdOrDomain } : { id: siteIdOrDomain }),
      },
    });
    if (site) {
      return { userId: ownerId, site };
    }
  }

  return null;
}
