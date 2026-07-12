import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716l2.905 2.255C16.568 13.94 17.64 11.74 17.64 9.2z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.905-2.254c-.806.54-1.837.86-3.051.86-2.344 0-4.328-1.584-5.036-3.711L.957 12.84A8.998 8.998 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.715a5.41 5.41 0 01-.28-1.715c0-.596.102-1.174.278-1.715L.957 5.159A8.998 8.998 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.327z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 5.159l3.007 2.326C4.672 5.164 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleButton({
  label = "Continue with Google",
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2.5 rounded-xl border-border-input py-5.5 text-[14px] font-semibold text-ink"
      onClick={onClick}
    >
      <GoogleIcon />
      {label}
    </Button>
  );
}
