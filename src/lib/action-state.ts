export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialActionState: ActionState = { status: "idle" };

export function actionError(
  message: string,
  fieldErrors?: ActionState["fieldErrors"],
): ActionState {
  return { status: "error", message, fieldErrors };
}

export function actionSuccess(message: string): ActionState {
  return { status: "success", message };
}

/** Map a Zod flatten() result into the shared action state shape. */
export function zodFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): ActionState["fieldErrors"] {
  return fieldErrors;
}
