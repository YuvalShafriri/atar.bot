# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`



# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

# אתר.בוט – LLM Integration, Latency, History, and Caching

## Advanced Model Usage & Latency
- **Model Selection:** Use Gemini 1.5 Flash (`gemini-1.5-flash-latest`) for low latency, or Pro for higher quality.
- **Keep Functions Warm:** Set `minInstances` in `firebase.json` to keep backend warm and reduce cold starts.
- **Efficient Prompts:** Only send necessary context to the LLM.
- **Region:** Deploy Firebase Functions in a region close to your users (e.g., `europe-west1`).

## Example: Set minInstances in `firebase.json`
```json
"functions": {
  "runtime": "nodejs20",
  "region": "europe-west1",
  "minInstances": 1
}
```

## Example: Use Flash Model in Backend
```js
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
```

---

## History (to Avoid Repeats & Provide Context)
- **Frontend:** Store previous user questions and LLM responses in a state variable (array).
- **Backend:** Accept a `history` array in the request and include it in the prompt (e.g., “Previous suggestions: ...”).
- **Prompt:** Instruct the LLM to avoid repeating previous ideas/tips.

### Example: Frontend History State (React)
```js
const [history, setHistory] = useState([]);
const handleLLMResponse = (question, response) => {
  setHistory([...history, { question, response }]);
};
```

---

## Caching (to Avoid Redundant LLM Calls)
- **Backend:** Implement a simple in-memory cache (e.g., a JavaScript object or Map) keyed by a hash of the prompt/context.
- **Advanced:** For persistent caching, use Redis or Firestore.

### Example: Simple In-Memory Cache in `functions/index.js`
```js
const cache = new Map();

exports.geminiProxy = functions.https.onRequest(async (req, res) => {
  const { prompt, history } = req.body;
  const cacheKey = JSON.stringify({ prompt, history });
  if (cache.has(cacheKey)) {
    return res.json(cache.get(cacheKey));
  }
  // ...existing code to call Gemini...
  const result = { ... }; // LLM response
  cache.set(cacheKey, result);
  res.json(result);
});
```

---

## Summary
- Use the Flash model for low latency.
- Set `minInstances` to keep functions warm.
- Store and send history to avoid repeats.
- Add backend caching for repeated queries.

---

**Note:**
- If you close your IDE, this chat session will not be saved. Copy important info to this README or another file for future reference.
