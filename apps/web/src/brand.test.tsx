import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("./brand", () => ({
  brand: {
    name: "Synthetic Brand Preview",
    tagline: "Synthetic tagline",
    logo: "dumbbell",
  },
}));
import { Login } from "./features/Login";
import { BrandLogo } from "./BrandLogo";
it("renders configured name, tagline and logo without changing auth contract", () => {
  const html = renderToStaticMarkup(<Login onLogin={() => {}} />);
  expect(html).toContain("Synthetic Brand Preview");
  expect(html).toContain("Synthetic tagline");
  expect(renderToStaticMarkup(<BrandLogo />)).toContain("lucide-dumbbell");
  expect(html).toContain("Kullanıcı adı");
});
