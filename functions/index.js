require("dotenv").config();

/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const cors = require("cors")({origin: true});


// Use only process.env for Gemini key (Firebase recommended)
const key = process.env.GEMINI_API_KEY;
console.log("GEMINI_API_KEY loaded from process.env");
console.log("GEMINI_API_KEY value:", key);

// Initialize the Google AI client with your API key
const genAI = new GoogleGenerativeAI(key);

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Gemini API Proxy Function
exports.geminiProxy = onRequest((req, res) => {
  // Use the cors middleware to handle CORS headers
  cors(req, res, async () => {
    console.log("Gemini proxy request received");
    console.log("Request body:", req.body);

    try {
      const {contents, model: modelName} = req.body;

      if (!contents) {
        return res.status(400).json({
          error: "Request body must contain 'contents'.",
        });
      }

      const model = genAI.getGenerativeModel({
        model: modelName || "gemini-1.5-flash",
      });

      logger.info(
          "Sending request to Gemini",
          {model: modelName, contents},
      );

      const result = await model.generateContent(contents);
      const response = await result.response;

      logger.info("Received response from Gemini");
      // Always return a JSON object with a predictable structure
      res.json({
        candidates: [
          {
            content: {
              parts: [
                {text: response.text()},
              ],
            },
          },
        ],
      });
    } catch (error) {
      logger.error(
          "Gemini proxy error",
          {
            errorMessage: error.message,
            errorStack: error.stack,
          },
      );
      res.status(500).json({
        error: "An error occurred in the Gemini proxy.",
        details: error.message,
      });
    }
  });
});
