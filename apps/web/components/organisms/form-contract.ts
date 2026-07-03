export interface FormSubmitState<TInput> {
  readonly errorMessage: string | null;
  readonly isPending: boolean;
  readonly submit: (input: TInput) => Promise<boolean>;
}
