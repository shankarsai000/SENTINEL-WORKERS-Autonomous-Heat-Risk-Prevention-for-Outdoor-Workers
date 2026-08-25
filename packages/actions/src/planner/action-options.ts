import { ActionType, ActionPriority } from '@sentinel/schemas';

export interface ActionOption {
  action_type: ActionType;
  priority: ActionPriority;
  reason_codes: string[];
  requires_acknowledgement: boolean;
  reversible: boolean;
  policy_basis: string;
  recommended_rest_minutes?: number;
  message_template: string;
}

export interface ActionPlanResult {
  worker_id: string;
  site_id: string;
  current_risk_level: string;
  predicted_risk_level?: string;
  candidate_options: ActionOption[];
  recommended_action: ActionOption;
}
