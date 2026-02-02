// Stub: agents table requires user_id which must reference an existing auth user
// Agents should be created through the proper registration flow, not seeding

export async function seedAgents() {
  console.log("seedAgents: agents require user_id from auth.users - use registration flow instead");
  return { success: false, message: "agents must be created via user registration" };
}
