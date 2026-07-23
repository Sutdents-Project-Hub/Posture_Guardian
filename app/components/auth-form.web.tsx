import type { FormEvent, PropsWithChildren } from 'react';

type AuthFormProps = PropsWithChildren<{
  onSubmit: () => void;
}>;

/** Give web browsers a semantic form so password managers and Enter submission work normally. */
export function AuthForm({ children, onSubmit }: AuthFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit}>
      {children}
      <button aria-hidden tabIndex={-1} type="submit" style={hiddenSubmitStyle} />
    </form>
  );
}

const hiddenSubmitStyle = {
  position: 'absolute' as const,
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: 'none' as const,
};
