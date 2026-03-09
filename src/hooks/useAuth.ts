import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type AppRole = "master" | "admin" | "operator" | "support";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data } = await supabase.rpc("get_user_roles", { _user_id: currentUser.id });
        setRoles((data as AppRole[]) || []);
      } else {
        setRoles([]);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        supabase.rpc("get_user_roles", { _user_id: currentUser.id }).then(({ data }) => {
          setRoles((data as AppRole[]) || []);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isMaster = hasRole("master");
  const isAdmin = isMaster || hasRole("admin");
  const isStaff = roles.length > 0;

  // Permission helpers
  const canManageUsers = isMaster;
  const canManageProducts = isMaster || hasRole("admin");
  const canManageZones = isMaster || hasRole("admin");
  const canManageNeighborhoods = isMaster || hasRole("admin");
  const canViewDashboard = isStaff;
  const canManageOrders = isStaff;
  const canUpdateOrderStatus = isStaff;

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    roles,
    loading,
    hasRole,
    isMaster,
    isAdmin,
    isStaff,
    canManageUsers,
    canManageProducts,
    canManageZones,
    canManageNeighborhoods,
    canViewDashboard,
    canManageOrders,
    canUpdateOrderStatus,
    signOut,
  };
};
