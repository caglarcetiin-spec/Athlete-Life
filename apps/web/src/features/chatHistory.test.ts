import { expect, it } from "vitest";
import { chatHistory } from "./chatHistory";
it("keeps complete recent pairs without sending historical images", () => {
  const messages: {
    role: "user" | "assistant";
    text: string;
    image?: string;
  }[] = [
    { role: "user", text: "Görsel sorusu", image: "private-bytes" },
    { role: "assistant", text: "Yanıt" },
  ];
  expect(chatHistory(messages, "Devam")).toEqual([
    { role: "user", text: "Görsel sorusu" },
    { role: "assistant", text: "Yanıt" },
    { role: "user", text: "Devam" },
  ]);
});
it("bounds long answers and long conversations without rejecting the new question", () => {
  expect(
    chatHistory(
      [
        { role: "user", text: "x".repeat(5000) },
        { role: "assistant", text: "y".repeat(20000) },
      ],
      "Yeni soru",
    ),
  ).toEqual([{ role: "user", text: "Yeni soru" }]);
  const messages = Array.from({ length: 30 }, (_, i) => ({
    role: (i % 2 ? "assistant" : "user") as "assistant" | "user",
    text: String(i),
  }));
  const history = chatHistory(messages, "Yeni soru");
  expect(history).toHaveLength(15);
  expect(history[0].text).toBe("16");
});
