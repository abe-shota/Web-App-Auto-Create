export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface RequirementsSummary {
  app_type: string;
  target_users: string;
  current_method: string;
  core_features: string[];
  nice_to_have: string[];
  summary: string;
}
