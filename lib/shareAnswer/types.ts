export type AnswerStyle = "chat" | "quote" | "note";

export const ANSWER_STYLES: AnswerStyle[] = ["chat", "quote", "note"];

export const STYLE_LABEL: Record<AnswerStyle, string> = {
  chat:  "Chat",
  quote: "Quote",
  note:  "Note",
};
