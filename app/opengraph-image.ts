import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt =
  "Northstar Ops - Turn clear priorities into steady progress.";
export const size = { width: 1728, height: 910 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const image = await readFile(join(process.cwd(), "public", "og.png"));

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": contentType,
    },
  });
}
