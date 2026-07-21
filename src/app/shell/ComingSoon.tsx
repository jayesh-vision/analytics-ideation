import { Sparkles } from "../icons";

// Placeholder surface for agents whose native screens aren't wired yet.
// (talk-to-your-data and Admin are already real surfaces.)
export function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-[460px] text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mb-2 text-foreground" style={{ fontSize: "20px", fontWeight: 600 }}>
          {title}
        </h2>
        <p className="text-muted-foreground" style={{ fontSize: "14px", lineHeight: 1.65 }}>
          {desc} This agent surface will run natively on the same build as the Talk-to-Data flow — the foundation is now in place.
        </p>
      </div>
    </div>
  );
}
