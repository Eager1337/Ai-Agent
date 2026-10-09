import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/soc/Shell";

const OWNER_EMAIL = "ebeaver091@gmail.com";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const isOwner = data.user.email?.toLowerCase() === OWNER_EMAIL;
    const hasPaidAccess = data.user.app_metadata?.paid_access === true;
    if (!isOwner && !hasPaidAccess) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => <Shell><Outlet /></Shell>,
});
