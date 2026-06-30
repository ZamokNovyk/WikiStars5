import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// Helper function to dynamically replace meta tags in html
function replaceMeta(htmlStr: string, attr: "name" | "property", nameVal: string, newVal: string): string {
  const regex = new RegExp(
    `<meta\\s+[^>]*?${attr}=["']${nameVal}["'][^>]*?content=["']([^"']*?)["'][^>]*?>|<meta\\s+[^>]*?content=["']([^"']*?)["'][^>]*?${attr}=["']${nameVal}["'][^>]*?>`,
    "i"
  );
  const escapedNewVal = newVal.replace(/"/g, "&quot;");
  if (regex.test(htmlStr)) {
    return htmlStr.replace(regex, `<meta ${attr}="${nameVal}" content="${escapedNewVal}" />`);
  } else {
    return htmlStr.replace("</title>", `</title>\n    <meta ${attr}="${nameVal}" content="${escapedNewVal}" />`);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyAbeWfXKXrC1I3BITns9gBjEH-kvZNpQFo",
    authDomain: "wikistars5-465e1.firebaseapp.com",
    projectId: "wikistars5-465e1",
    storageBucket: "wikistars5-465e1.firebasestorage.app",
    messagingSenderId: "860844799689",
    appId: "1:860844799689:web:7435a00e23796fa9053f18",
    measurementId: "G-EW8RPKXVBJ"
  };

  const firebaseApp = initializeApp(firebaseConfig);
  const db = getFirestore(firebaseApp);

  // Health check API endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Handle favicon.ico explicitly to avoid returning index.html (which confuses browsers)
  app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "wikistars_app_icon.svg"));
  });

  let vite: any = null;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
  }

  // Intercept main shared routes to inject dynamic meta tags for crawlers/sharing platforms
  app.get(["/campus/:id", "/perfiles/:id", "/profile/:id"], async (req, res, next) => {
    try {
      const { id } = req.params;
      const isCampus = req.path.startsWith("/campus/");
      const isPerfil = req.path.startsWith("/perfiles/");
      const isStudent = req.path.startsWith("/profile/");

      let title = "Starryz5: Popularidad estudiantil";
      let description = "Descubre la popularidad de estudiantes, docentes e instituciones. Compara perfiles, vota en Versus ELO de reinados, califica a tus profesores favoritos y sé parte de la comunidad de tu centro educativo.";
      let imageUrl = "https://firebasestorage.googleapis.com/v0/b/wikistars5-465e1.firebasestorage.app/o/wikistars5logo.png?alt=media&token=026f822e-3b69-4538-b0ef-28dacb65551e";
      const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

      if (isCampus && id) {
        const docRef = doc(db, "centros.educativos", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const name = data.name || "Centro Educativo";
          if (data.perfilPhotoUrl) {
            imageUrl = data.perfilPhotoUrl;
          }

          if (req.query.tab === "reinado" || req.query.tab === "Reinado" || req.query.tab === "reinado") {
            title = `👑 Reinado ELO - ${name}`;
            description = `¡Vota por tu candidata favorita en el Versus ELO del Reinado de ${name}! Elige quién ganará la corona en Starryz5.`;
          } else {
            title = `${name} | Starryz5`;
            description = `¡Mira el Campus Hub de ${name} en Starryz5! Accede para ver perfiles, noticias, eventos y más.`;
          }
        }
      } else if (isPerfil && id) {
        const docRef = doc(db, "perfiles", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const name = data.nombreCompleto || "Docente";
          let instName = "su instituto";

          if (data.instituteId) {
            const instRef = doc(db, "centros.educativos", data.instituteId);
            const instSnap = await getDoc(instRef);
            if (instSnap.exists()) {
              const instData = instSnap.data();
              instName = instData.name || "su instituto";
              if (instData.perfilPhotoUrl) {
                imageUrl = instData.perfilPhotoUrl;
              }
            }
          }

          title = `Prof. ${name} | ${instName}`;
          description = `🌟 Mira el perfil de la estrella docente ${name} en ${instName}. Califica sus clases, vota y deja tus comentarios en Starryz5.`;
        }
      } else if (isStudent && id) {
        const docRef = doc(db, "alumnos", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const name = data.name || "Estudiante";
          let instName = "su instituto";

          if (data.instituteId) {
            const instRef = doc(db, "centros.educativos", data.instituteId);
            const instSnap = await getDoc(instRef);
            if (instSnap.exists()) {
              const instData = instSnap.data();
              instName = instData.name || "su instituto";
              if (instData.perfilPhotoUrl) {
                imageUrl = instData.perfilPhotoUrl;
              }
            }
          }

          title = `${name} | ${instName}`;
          description = `⚡ Explora el perfil estudiantil de ${name} en Starryz5. ¡Mira sus rachas, puntos acumulados e interactúa con la comunidad escolar!`;
        }
      }

      // Read template index.html
      let html = "";
      if (process.env.NODE_ENV !== "production" && vite) {
        const rawHtml = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        html = await vite.transformIndexHtml(req.originalUrl, rawHtml);
      } else {
        html = fs.readFileSync(path.join(process.cwd(), "dist", "index.html"), "utf-8");
      }

      // Inject Meta Tags
      html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
      html = replaceMeta(html, "name", "description", description);
      html = replaceMeta(html, "property", "og:title", title);
      html = replaceMeta(html, "property", "og:description", description);
      html = replaceMeta(html, "property", "og:image", imageUrl);
      html = replaceMeta(html, "property", "og:url", fullUrl);
      html = replaceMeta(html, "name", "twitter:title", title);
      html = replaceMeta(html, "name", "twitter:description", description);
      html = replaceMeta(html, "name", "twitter:image", imageUrl);

      res.setHeader("Content-Type", "text/html");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      res.send(html);
    } catch (err) {
      console.error("Meta injection failed:", err);
      if (process.env.NODE_ENV !== "production") {
        next();
      } else {
        res.sendFile(path.join(process.cwd(), "dist", "index.html"));
      }
    }
  });

  // Serve with Vite middleware in development, and serve compiled files in production
  if (process.env.NODE_ENV !== "production") {
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files with proper cache-control headers
    app.use(express.static(distPath, {
      maxAge: "1d",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          // SPA landing pages should never be cached so they always request latest hashed assets
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
        } else if (filePath.includes("/assets/") || filePath.includes("\\assets\\")) {
          // Hashed static assets can be cached safely for a long time
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    }));

    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
