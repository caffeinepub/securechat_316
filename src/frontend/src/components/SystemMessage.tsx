interface SystemMessageProps {
  text: string;
}

export function SystemMessage({ text }: SystemMessageProps) {
  return (
    <div className="flex justify-center my-2">
      <div className="px-3 py-1 rounded-full bg-muted/80 text-[11px] text-muted-foreground font-medium">
        {text}
      </div>
    </div>
  );
}
