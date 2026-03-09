import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is master
    const authHeader = req.headers.get("Authorization")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: callerRoles } = await supabaseAdmin.rpc("get_user_roles", { _user_id: caller.id });
    const isMaster = (callerRoles as string[] || []).includes("master");
    if (!isMaster) {
      return new Response(JSON.stringify({ error: "Sem permissão. Apenas Master pode gerenciar usuários." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "list") {
      // List all users with their roles
      const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;

      const { data: allRoles } = await supabaseAdmin.from("user_roles").select("*");
      const { data: allProfiles } = await supabaseAdmin.from("profiles").select("*");

      const users = authUsers.users.map((u) => {
        const roles = (allRoles || []).filter((r: any) => r.user_id === u.id);
        const profile = (allProfiles || []).find((p: any) => p.user_id === u.id);
        return {
          id: u.id,
          email: u.email,
          full_name: profile?.full_name || "",
          phone: profile?.phone || "",
          roles: roles.map((r: any) => r.role),
          active: !u.banned_until || new Date(u.banned_until) < new Date(),
          created_at: u.created_at,
        };
      });

      return new Response(JSON.stringify({ users }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create") {
      const { email, password, full_name, role } = body;
      if (!email || !password || !role) {
        return new Response(JSON.stringify({ error: "Email, senha e tipo de acesso são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (createErr) throw createErr;

      // Assign role
      await supabaseAdmin.from("user_roles").insert({ user_id: newUser.user.id, role });

      // Create profile
      await supabaseAdmin.from("profiles").insert({ user_id: newUser.user.id, full_name: full_name || "" });

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update") {
      const { user_id, full_name, role, email } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Update profile
      if (full_name !== undefined) {
        await supabaseAdmin.from("profiles").update({ full_name }).eq("user_id", user_id);
      }

      // Update email
      if (email) {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { email });
      }

      // Update role
      if (role) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
        await supabaseAdmin.from("user_roles").insert({ user_id, role });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "toggle_active") {
      const { user_id, active } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (active) {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      } else {
        // Ban for 100 years = effectively disabled
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
