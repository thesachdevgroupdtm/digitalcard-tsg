import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

async function startServer() {
  const app = express();
  const PORT = 3000;

  const getOgHtml = async (slug: string) => {
    try {
      const { data: employee, error } = await supabase
        .from("employees")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error || !employee) {
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Galaxy Toyota | Digital Card</title>
              <meta property="og:title" content="Galaxy Toyota | Digital Card" />
              <meta property="og:description" content="View digital business card." />
              <meta http-equiv="refresh" content="0; url=/card/${slug}" />
              <script>window.location.href = "/card/${slug}";</script>
            </head>
            <body>Redirecting...</body>
          </html>
        `;
      }

      const name = employee.name || "Employee";
      const designation = employee.designation || "Team Member";
      const photo = employee.photo || "https://galaxytoyota.in/assets/images/logo.png";
      const brand = "Galaxy Toyota";
      const description = `${designation} at ${brand}`;
      const url = `https://card.galaxytoyota.in/card/${slug}`;

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${name} | ${brand}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            
            <!-- Open Graph / Facebook -->
            <meta property="og:type" content="website" />
            <meta property="og:url" content="${url}" />
            <meta property="og:title" content="${name} | ${brand}" />
            <meta property="og:description" content="${description}" />
            <meta property="og:image" content="${photo}" />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />

            <!-- Twitter -->
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content="${url}" />
            <meta property="twitter:title" content="${name} | ${brand}" />
            <meta property="twitter:description" content="${description}" />
            <meta property="twitter:image" content="${photo}" />

            <!-- Redirect -->
            <meta http-equiv="refresh" content="0; url=/card/${slug}" />
            <script>window.location.href = "/card/${slug}";</script>
          </head>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f9f9f9;">
            <div style="text-align: center;">
              <img src="${photo}" alt="${name}" style="width: 120px; height: 120px; border-radius: 50%; object-cover: cover; margin-bottom: 20px; border: 4px solid #EB0A1E;">
              <h1 style="margin: 0; color: #333;">${name}</h1>
              <p style="color: #666;">${designation}</p>
              <p style="color: #EB0A1E; font-weight: bold;">${brand}</p>
              <p style="font-size: 14px; color: #999; margin-top: 20px;">Redirecting to digital card...</p>
            </div>
          </body>
        </html>
      `;
    } catch (err) {
      console.error("Error generating OG HTML:", err);
      return `<html><head><meta http-equiv="refresh" content="0; url=/card/${slug}" /></head><body>Redirecting...</body></html>`;
    }
  };

  // API route for OG
  app.get("/api/og/:slug", async (req, res) => {
    const { slug } = req.params;
    const html = await getOgHtml(slug);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });

  // Intercept /card/:slug for crawlers or just serve OG tags and redirect
  app.get("/card/:slug", async (req, res, next) => {
    const userAgent = req.headers["user-agent"] || "";
    const isCrawler = /WhatsApp|LinkedIn|facebookexternalhit|Twitterbot|Slackbot|Discordbot|TelegramBot/i.test(userAgent);

    if (isCrawler) {
      const { slug } = req.params;
      const html = await getOgHtml(slug);
      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    }
    
    // If not a crawler, let Vite/SPA handle it
    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
