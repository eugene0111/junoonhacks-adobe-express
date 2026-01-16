import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { generateBrandProfile } from "./src/services/brandGenerator.js";
import { crawlWebsite } from "./src/services/websiteCrawler.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ status: "ok", message: "BrandGuard API is running" });
});

app.post("/brand/generate", async (req, res) => {
    try {
        const { brand_name, brand_statement, format, website_url } = req.body;

        if (!brand_statement && !website_url) {
            return res.status(400).json({
                error: "Either brand_statement or website_url is required"
            });
        }

        if (!format) {
            return res.status(400).json({
                error: "format is required (e.g., 'instagram_post', 'facebook_post', 'story', 'banner', 'poster')"
            });
        }

        let brandData = {
            brand_name: brand_name || "Unknown Brand",
            brand_statement: brand_statement || "",
            format: format
        };

        if (website_url) {
            try {
                const crawledData = await crawlWebsite(website_url);
                brandData = { ...brandData, ...crawledData };
            } catch (error) {
                console.error("Website crawling error:", error.message);
            }
        }

        const brandProfile = await generateBrandProfile(brandData);

        res.json({
            brand_profile: brandProfile
        });
    } catch (error) {
        console.error("Error generating brand profile:", error);
        res.status(500).json({
            error: "Failed to generate brand profile",
            message: error.message
        });
    }
});


app.listen(port, () => {
    console.log(`BrandGuard API listening on port ${port}`);
});
