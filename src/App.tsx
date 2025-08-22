// English-only App.tsx
import React, { useEffect, useState } from "react";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import "./styles/globals.css";
import ImprovedGraphDashboard from "./components/Graph/ImprovedGraphDashboard";
import { WorkshopReport } from "./components/WorkshopReport";
import KGMapPage from "./components/KGMapPage";
import { prependLangInstruction } from "./utils/language";

const LLM_MODEL = "gemini-2.5-flash-lite";

// Nav: order controls tab position; Dashboard is present but hidden (visible: false)
const navItems = [
  { id: "home-en", label: "Home", visible: true },
  { id: "hands-on-1", label: "Hands-on 1", visible: true },
  { id: "hands-on-2", label: "Hands-on 2", visible: true },
  { id: "discussion", label: "Discussion", visible: true },
  { id: "tips", label: "Tips", visible: true },
  { id: "ideas", label: "Ideas", visible: true },
  { id: "kg-map", label: "KG-MAP", visible: false },
  { id: "dashboard", label: "Knowledge Graphs", visible: false },
  { id: "workshop-report", label: "Workshop Report", visible: false },
];

// AI Configuration
const ai = {
  enabled: true,
};

// LLM Functions for Tips and Ideas pages
async function askTipsLLM(
  question: string,
  tipsList: Array<{ title: string; text: string }>
): Promise<string> {
  if (!ai) return "Error: API key not configured.";
  let ideasContext = "Existing ideas:\n";
  tipsList.forEach((idea) => {
    ideasContext += `- ${idea.title}: ${idea.text}\n`;
  });
  const promptBase = `${question} (Answer very briefly. Do not repeat tips already shown above.)`;
  const prompt = prependLangInstruction(promptBase, question);
  const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
  if (!proxyUrl) {
    console.error(
      "Error: VITE_GEMINI_PROXY_URL is not defined. Please check your .env.local file in the project root."
    );
    return "Server configuration error.";
  }
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LLM_MODEL,
      contents: prependLangInstruction(ideasContext + "\n" + prompt, question),
    }),
  });

  if (!response.ok) {
    return "Error getting response from bot.";
  }

  const result = await response.json();
  const text =
    result.candidates?.[0]?.content?.parts?.[0]?.text ||
    "No response received from bot.";

  // --- Token counting and cost calculation ---
  function countTokens(str: string): number {
    return Math.ceil(str.length / 2.5);
  }
  const inputTokens = countTokens(ideasContext + "\n" + prompt);
  const outputTokens = countTokens(text);
  const totalTokens = inputTokens + outputTokens;
  const cost = totalTokens * 0.0000001;
  console.log(
    `[Tips LLM] Input: ${inputTokens} | Output: ${outputTokens} | Total: ${totalTokens} | Cost: $${cost.toFixed(
      6
    )}`
  );

  return text;
}

async function askBrainstormLLM(
  question: string,
  ideasList: any[]
): Promise<string> {
  if (!ai) return "Error: API key not configured.";
  if (!question.trim()) return "";
  let ideasContext = "Existing ideas:\n";
  ideasList.forEach((idea) => {
    ideasContext += `- ${idea.title}: ${idea.text}\n`;
  });
  const promptBase = `${question} (Answer very briefly. Do not repeat ideas already presented above.)`;
  const prompt = prependLangInstruction(promptBase, question);
  const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
  if (!proxyUrl) {
    console.error(
      "Error: VITE_GEMINI_PROXY_URL is not defined. Please check your .env.local file in the project root."
    );
    return "Server configuration error.";
  }
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LLM_MODEL,
      contents: prependLangInstruction(ideasContext + "\n" + prompt, question),
    }),
  });

  if (!response.ok) {
    return "Error getting response from bot.";
  }

  const result = await response.json();
  const text =
    result.candidates?.[0]?.content?.parts?.[0]?.text ||
    "No response received from bot.";

  // --- Token counting and cost calculation ---
  function countTokens(str: string): number {
    return Math.ceil(str.length / 2.5);
  }
  const inputTokens = countTokens(ideasContext + "\n" + prompt);
  const outputTokens = countTokens(text);
  const totalTokens = inputTokens + outputTokens;
  const cost = totalTokens * 0.0000001;
  console.log(
    `[Brainstorm LLM] Input: ${inputTokens} | Output: ${outputTokens} | Total: ${totalTokens} | Cost: $${cost.toFixed(
      6
    )}`
  );

  return text;
}

// Small AiSpot component used by Tips/Ideas pages
const AiSpot: React.FC<{
  spotId: "tips" | "ideas";
  onQuery: (q: string) => Promise<string>;
  exampleQueries?: string[];
}> = ({ spotId, onQuery, exampleQueries }) => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const config = {
    tips: {
      title: "Ask the bot for tips",
      description: "Request short, actionable tips.",
      placeholder: "e.g. Give me a prompt template for step 1",
    },
    ideas: {
      title: "Brainstorm ideas",
      description: "Generate new ideas based on examples.",
      placeholder: "e.g. Suggest an interactive timeline feature",
    },
  }[spotId];

  const handleAsk = async (q?: string) => {
    const query = q ?? input;
    if (!query.trim() || loading) return;
    setLoading(true);
    setOutput("Querying model...");
    try {
      const r = await onQuery(query);
      setOutput(r);
    } catch (e) {
      setOutput("Error calling model.");
    }
    setLoading(false);
  };

  return (
    <div className="ai-spot mt-2">
      <div className="flex items-baseline gap-2 mb-2">
        <h4 className="font-bold text-lg text-blue-800">{config.title}</h4>
        <p className="text-sm text-gray-600">{config.description}</p>
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={config.placeholder}
          className="flex-grow p-2 border rounded"
        />
        <button onClick={() => handleAsk()} disabled={loading} className="btn">
          Ask
        </button>
      </div>
      {exampleQueries && exampleQueries.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {exampleQueries.map((q, i) => (
            <button
              key={i}
              className="px-2 py-1 rounded border text-xs bg-gray-100"
              onClick={() => handleAsk(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}
      <div className="p-3 mt-2 bg-white rounded border min-h-[80px] whitespace-pre-wrap">
        {output}
      </div>
    </div>
  );
};

// Pages
const HomePageEn: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showBrainTooltip, setShowBrainTooltip] = useState(false);




  
  return (
    <div id="home-en">
       

      {/* Section title for useful links */}
      <div className="mt-7">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-4 rounded-lg shadow mb-4">
            <h2 className="text-xl font-semibold text-gray-800 m-0">
              Useful Workshop Links - https://alephplace.com/cipa25
            </h2>
          </div>
          <div className="flex flex-col gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <ul className="custom-list space-y-2 text-lg mb-2">
                <li className="icon-bot">
                  <a
                    href="https://chatgpt.com/g/g-68a7547de5dc819194f1c7eb80e0e234-caltural-insites-v5-cipa-workshop"
                    target="_blank"
                    rel="noopener"
                    className="text-blue-600 hover:underline"
                  >
                     <em>Cultural-Insites GPTs</em>
                  </a>
                </li>
                <li className="icon-brain flex items-center gap-2">
                  <a
                    href="https://drive.google.com/file/d/1UJkHNSPJA5hjsN6-uVkOVmNHzpyIieaN/view?usp=sharing"
                    target="_blank"
                    rel="noopener"
                    className="text-blue-600 hover:underline"
                  >
                    <em>Cultural-Insites 'Brain'</em>
                  </a>
                  <div
                    className="relative flex items-center ml-1"
                    tabIndex={0}
                    onMouseEnter={() => setShowBrainTooltip(true)}
                    onMouseLeave={() => setShowBrainTooltip(false)}
                    onFocus={() => setShowBrainTooltip(true)}
                    onBlur={() => setShowBrainTooltip(false)}
                    style={{ cursor: "pointer", position: "relative" }}
                  >
                    &nbsp;
                    <img
                      src={`${import.meta.env.BASE_URL ?? "/"}images/i.png`}
                      alt="Info"
                      style={{ width: 18, height: 18, display: "inline-block" }}
                      aria-label="Info"
                    />
                    {showBrainTooltip && (
                      <div
                        className="absolute z-50 left-full ml-2 top-1/2 -translate-y-1/2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 shadow-lg w-72 max-w-xs"
                        style={{ direction: "ltr", whiteSpace: "normal" }}
                      >
                        This file contains all process steps, guidelines, and
                        CBSA knowledge required for execution. You can save it
                        and upload to any chatbot environment (Gemini, Claude,
                        ChatGPT etc.) to run the process there - recommended to
                        use in a project environment that allows memory between
                        project conversations.
                      </div>
                    )}
                  </div>
                </li>
                <li className="icon-drive">
                  <a
                    href="https://drive.google.com/drive/folders/1Qqs0x8Raks34Ykmn82VXeuiGdOq4T7R5?usp=sharing"
                    target="_blank"
                    rel="noopener"
                    className="text-blue-600 hover:underline"
                  >
                    Shared Workshop Folder (Google Drive)
                  </a>
                </li>
                <li className="icon-graph">
                  <a
                    href="https://poloclub.github.io/transformer-explainer/"
                    target="_blank"
                    rel="noopener"
                    className="text-blue-600 hover:underline"
                  >
                    Transformer Mechanism Visualization for Next Word Prediction
                  </a>
                </li>
                {/* <li className="relative flex items-center">
                                    <a
                                        href="https://notebooklm.google.com/notebook/1e35445c-cebc-4b5c-a09d-13b13e432254/"
                                        target="_blank"
                                        rel="noopener"
                                        className="text-blue-600 hover:underline"
                                    >
                                        Challenges and Solutions Analysis (NotebookLM)
                                    </a>
                                    <div
                                        className="relative flex items-center ml-2"
                                        tabIndex={0}
                                        onMouseEnter={() => setShowTooltip(true)}
                                        onMouseLeave={() => setShowTooltip(false)}
                                        onFocus={() => setShowTooltip(true)}
                                        onBlur={() => setShowTooltip(false)}
                                        style={{ cursor: 'pointer', position: 'relative' }}
                                    >
                                      &nbsp;
                                        <img
                                            src={`${import.meta.env.BASE_URL ?? '/'}images/i.png`}
                                            alt="Info"
                                            style={{ width: 18, height: 18, display: 'inline-block' }}
                                            aria-label="Info"
                                        />
                                        {showTooltip && (
                                            <div
                                                className="absolute z-50 left-full ml-2 top-1/2 -translate-y-1/2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 shadow-lg w-72 max-w-xs"
                                                style={{ direction: 'ltr', whiteSpace: 'normal' }}
                                            >
                                                Analysis of discussions at cycle openings and summaries, aimed at extracting insights on advancing cultural assessment and AI integration.
                                            </div>
                                        )}
                                    </div>
                                </li> */}
              </ul>
            </div>
            {
              <div className="bg-white p-3 rounded-lg shadow">
                <iframe
                  src="https://docs.google.com/presentation/d/e/2PACX-1vSnYYwuMoAKZpIICwBBH5g6DkqLRgUr-lSRVJO77A2KIA0nenhxFoj5u2O6NJ735m8fyk7z-23sFrnd/pubembed?start=false&loop=false&delayms=10000"
                  frameBorder={0}
                  width="100%"
                  height={559}
                  allowFullScreen
                ></iframe>
              </div>
            }
            {/* Workshop schedule image card */}
            <div className="bg-white p-0 rounded-lg shadow">
              <div
                className="full-viewport-image"
                style={{ ["--nav-footer-height" as any]: "96px" }}
              >
                <img
                  src={`${import.meta.env.BASE_URL ?? "/"}images/plan3.png`}
                  alt="Workshop Agenda and Activities"
                />
              </div>
            </div>
            {/* <div className="bg-white p-3 rounded-lg shadow">
                            <p className="mt-2 text-gray-700 leading-relaxed">
                                In the atar.bot workshop we re-examined the ways we assess the significance of heritage assets, using the CBSA method (Context-Based Significance Assessment) which is based on context, information and interpretive reading. Alongside this, we tried to integrate generative artificial intelligence as a cognitive partner – which can expand perspective, sharpen formulations and reveal connections, as long as human oversight is maintained.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <img src="https://alephplace.com/atar.bot/llms.jpg" alt="Satirical illustration of feeding language models with internet content" className="w-full h-auto rounded-md object-cover" />
                                <img src="https://alephplace.com/atar.bot/alice.jpg" alt="Illustration of Alice in Wonderland looking in a mirror" className="w-full h-auto rounded-md object-cover" />
                            </div>
                        </div> */}
            
          </div>
        </div>
      </div>
    </div>
  );
};

const ExperiencePageEn: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const experienceStepsEn = [
    {
      icon: "✅",
      title: "Stage 0 – Pre‑check & Data‑Gap Scan",
      practical: [
        "Upload the heritage asset information file.",
        "Run the Pre‑check to verify: Location & Setting; Original function & Dates; Evolution / Phases; Contexts; Physical description; Finds / Artefacts.",
        "Confirm and record any missing or ambiguous items before proceeding to Stage 1.",
      ],
      goal: "Run an ultra‑light health‑check and produce a concise gaps list so Stage 1 can proceed reliably.",
      actions:
        "Validate required fields per Steps.md, produce Summary and Gaps table, apply the Timeline Rule and flag uncertainties.",
      questions:
        "Content check: does the material explicitly contain Location, Original function/dates, Evolution phases, Contexts, Physical description and Finds? If not, which items are missing or ambiguous (cite file/paragraph where possible)?",
      reflection: [
        "Which critical facts are missing and where can they be obtained?",
        "Were any timeline or phase statements ambiguous or contradictory?",
      ],
    },
    {
      // Step 1 icon changed to represent web / knowledge graph
      icon: "🕸️",
      title: "Step 1 – Context Analysis and Asset Description",
      practical: [
        "Upload a heritage asset information file.",
        'Tell the bot: "Perform step 1 on the information I uploaded".',
        "Check that the description includes introduction, historical development, timeline, and key contexts.",
      ],
      goal: "Create a comprehensive description of the asset (at least 800 words) based on identified contexts.",
      actions:
        "Information processing and context identification (structural, historical, social, etc.), writing a structured description including introduction, historical development and timeline.",
      questions:
        "Content‑based checks: which passages support Location, founding date(s), and at least two development phases? Are the key contexts (social, historical, urban, landscape) explicitly evidenced?",
      reflection: [
        "What worked well in the bot activation process?",
        "Where was human intervention needed to refine or complete information?",
      ],
    },
    {
      // Step 2 icon changed to resemble values
      icon: "💎",
      title: "Step 2 – Cultural Significance Analysis (Values)",
      practical: [
        "Request: Continue to step 2",
        "Ensure the bot properly identifies the key values (aesthetic, historical, social).",
        "If needed, request completions, refinement and focus of the information.",
      ],
      goal: "Identification and analysis of the asset's key values, based on contexts and evidence.",
      actions:
        "Value identification (aesthetic, historical, social), analysis of how they are expressed in the asset, and linking them to broader contexts.",
      questions:
        "Content‑based checks: for each proposed value, point to the exact attribute or quote that supports it (file/paragraph). Are there missing community or documentary evidences for any value?",
      reflection: [
        "Did atar.bot succeed in articulating complex values, nuances and unexpected insights?",
        "What required human reinforcement or additional cultural context?",
      ],
    },
    {
      // Step 3 icon changed to resemble antiques / heritage objects
      icon: "🏺",
      title: "Step 3 – Authenticity and Integrity Analysis",
      practical: [
        "Request: Continue to step 3",
        "Ensure the bot examines authenticity according to Nara Grid (form, materials, use).",
        "If needed, request completions or refinement.",
      ],
      goal: "Analysis of conservation status, integrity and authenticity of the asset and their impact on its values.",
      actions:
        "Comparison between current and historical state, application of Nara Grid to examine aspects like form, materials and use, and assessment of overall preservation condition.",
      questions:
        "Content‑based checks: which physical attributes (materials, workmanship, alterations) are cited as evidence for authenticity or loss? Cite file/paragraphs for each attribute.",
      reflection: [
        "Did the bot succeed in distinguishing between physical integrity and cultural values?",
        "Was human clarification or completion needed?",
      ],
    },
    {
      icon: "⚖️",
      title: "Step 4 – Comparative Assessment",
      practical: [
        "Request: Continue to step 4",
        "Ensure the bot identifies comparison sites, analyzes design and functional characteristics, and highlights uniqueness or rarity.",
      ],
      goal: "Analysis of the asset's uniqueness compared to similar sites in terms of value, function and history.",
      actions:
        "Identification of comparison sites, analysis of design and functional characteristics, and highlighting the uniqueness or rarity of the asset.",
      questions:
        "Content‑based checks: list at least two comparanda and the exact criteria (Period, Rarity, Documentation, Ensemble, Condition) used for each comparison (cite sources).",
      reflection: [
        "Did the bot succeed in highlighting the asset's uniqueness?",
        "Was human completion or additional examples needed?",
      ],
    },
    {
      icon: "✍️",
      title: "Step 5 – Cultural Significance Statement Formulation",
      practical: [
        "Write: Continue to step 5",
        "Ensure the significance statement reflects all values and contexts.",
        "Try to reach an initial draft of the statement in several paragraphs.",
      ],
      goal: "Formulation of a cohesive, complete and evidence-based narrative highlighting the cultural significance of the asset.",
      actions:
        "Synthetic writing integrating all findings, emphasizing the asset's contribution to values, using professional and narrative language.",
      questions:
        "Content‑based checks: which Stage 1–4 elements must appear in the opening paragraph (timeline entries; key values; Nara aspects; comparatives)? List exact citations to include.",
      reflection: [
        "Does the statement summarize all values and contexts?",
        "Is there room for further expansion or refinement?",
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Cultural Assessment Steps using CBSA Approach - with atar.bot
      </h2>
      {experienceStepsEn.map((step, idx) => (
        <div key={idx} className="border border-gray-200 rounded-lg mb-2">
          <button
            type="button"
            className={`w-full flex items-center justify-between p-5 font-semibold text-left text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors ${
              openIdx === idx ? "bg-indigo-50" : ""
            }`}
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none" aria-hidden>
                {step.icon}
              </span>
              <span className="text-base">{step.title}</span>
            </div>
            <svg
              className={`w-6 h-6 shrink-0 transform transition-transform ${
                openIdx === idx ? "rotate-180" : ""
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              ></path>
            </svg>
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ${
              openIdx === idx ? "max-h-screen p-5" : "max-h-0"
            }`}
          >
            {openIdx === idx && (
              <div className="space-y-4">
                <ul className="custom-list space-y-2 text-lg">
                  {step.practical.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p>
                    <strong>🎯 Goal:</strong> {step.goal}
                  </p>
                  <p>
                    <strong>🧠 Bot Actions:</strong> {step.actions}
                  </p>
                  <p className="bg-indigo-50 p-3 rounded-md mt-2">
                    <strong>❓ Stop Questions:</strong> {step.questions}
                  </p>
                </div>
                <div className="bg-blue-50 border-2 border-dashed border-blue-400 rounded-lg p-4 mt-2">
                  <h3 className="text-xl font-bold text-slate-700 mb-3">
                    Reflection
                  </h3>
                  <ul className="custom-list space-y-2 text-lg">
                    {step.reflection.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const HandsOn2Page: React.FC = () => {
  const files = [
    { id: "cbsa", label: "CBSA Runner", href: "cbsa2gpt.html" },
    { id: "kgmap", label: "KG Map", href: "kg-map.html" },
    { id: "mills", label: "Mills Map", href: "mills-map.html" },
  ];

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalFile, setModalFile] = React.useState<{
    id: string;
    label: string;
    href: string;
  } | null>(null);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function openModal(f: { id: string; label: string; href: string }) {
    setModalFile(f);
    setModalOpen(true);
  }

  return (
    <div className="space-y-4 py-6">
      <h2 className="text-2xl font-bold text-center">Hands-on 2</h2>
      <div className="bg-white p-6 rounded shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {files.map((f) => (
            <button
              key={f.id}
              onClick={() => openModal(f)}
              className={`w-full text-left p-4 border rounded hover:shadow ${
                modalFile?.id === f.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200"
              }`}
            >
              <div className="font-semibold">{f.label}</div>
              <div className="text-sm text-gray-500">{f.href}</div>
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-600">
          Click any card to open the page inline in a modal. Use the close
          button or Esc to dismiss.
        </p>

        {modalOpen && modalFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setModalOpen(false)}
            />
            <div
              className="relative bg-white rounded-md shadow-lg w-[96vw] h-[94vh] max-w-[1200px] overflow-hidden"
              style={{ display: "flex", flexDirection: "column" }}
            >
              {/* Minimal header: keep label + compact controls only */}
              <div
                className="flex items-center justify-between px-2 border-b"
                style={{ height: 40, minHeight: 40 }}
              >
                <div className="font-medium text-sm truncate px-1">
                  {modalFile.label}
                </div>
                <div className="flex items-center gap-2 pr-1">
                  <a
                    href={modalFile.href}
                    target="_blank"
                    rel="noopener"
                    className="text-sm text-blue-600 hover:underline"
                    style={{ padding: "4px 6px" }}
                  >
                    Open
                  </a>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="p-1 rounded border"
                    aria-label="Close modal"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* iframe fills remaining space */}
              <iframe
                title={modalFile.label}
                src={modalFile.href}
                style={{ flex: 1, width: "100%", height: "100%", border: 0 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DiscussionPage: React.FC = () => {
  return (
    <div id="discussion" className="space-y-6 py-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Workshop Feedback
        </h2>
        <p className="text-lg text-gray-600">
          Share your thoughts, ideas, and suggestions about the workshop experience.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Feedback Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form action="https://formspree.io/f/xdkdqnvq" method="POST" className="space-y-6">
            <input type="hidden" name="_subject" value="Workshop Feedback - Cultural Assessment" />
            
            {/* Ideas and Thoughts */}
            <div className="border-l-4 border-blue-500 pl-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  💡
                </span>
                <h3 className="text-xl font-semibold text-gray-800">
                  Ideas & Thoughts
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                 Any insights, positive or other sentiments, experiences, or  discoveries during the workshop?
              </p>
              <textarea
                name="ideas_thoughts"
                placeholder="Share your ideas, insights, positive experiences, or useful discoveries..."
                className="w-full h-32 p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none"
                required
              />
            </div>

            {/* Suggestions and Improvements */}
            <div className="border-l-4 border-green-500 pl-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  🔧
                </span>
                <h3 className="text-xl font-semibold text-gray-800">
                  Suggestions & Improvements
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                What could be improved? Any challenges, suggestions for better approaches, or ideas for future cultural assessments in 2050?
              </p>
              <textarea
                name="suggestions_improvements"
                placeholder="Share suggestions for improvements, challenges faced, or ideas for future workshops..."
                className="w-full h-32 p-4 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 resize-none"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Send Feedback
              </button>
            </div>
          </form>

          {/* Thank you message */}
          <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🙏</span>
              <h4 className="text-lg font-semibold text-gray-800">
                Thank you for your feedback!
              </h4>
            </div>
            <p className="text-gray-700">
              Your input helps us improve future workshops and the cultural assessment process. 
              All feedback is valuable for research and development.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const TipsPage: React.FC = () => {
  const tipsList = [
    {
      title: "Define persona",
      text: "Start prompts with a clear persona to focus responses.",
    },
    {
      title: "Provide context",
      text: "Include relevant report/excerpt for deeper analysis.",
    },
    {
      title:
        "SMART Goals (Specific, Measurable, Achievable, Relevant, Time-bound)",
      text: "Structure heritage assessment requests with specific criteria, measurable outcomes, achievable scope, relevant context, and clear timeframes.",
    },
    {
      title: "PEACE Process (Prepare, Engage, Account, Closure, Evaluate)",
      text: "Prepare your heritage data, Engage with the bot systematically, Account for all findings, Close with clear conclusions, Evaluate the assessment quality.",
    },
    {
      title:
        "VALUE Framework (Vision, Assets, Legacy, Understanding, Expression)",
      text: "Define your Vision for the heritage site, identify key Assets, consider the Legacy impact, ensure deep Understanding of context, and plan clear Expression of significance.",
    },
    {
      title: "CORE Analysis (Context, Objects, Relationships, Evolution)",
      text: "Examine the historical Context, identify significant Objects/features, map Relationships between elements, and trace Evolution over time.",
    },
    {
      title:
        "CLEAR Communication (Concise, Logical, Engaging, Actionable, Respectful)",
      text: "Keep prompts Concise and focused, use Logical structure, make requests Engaging, ensure outputs are Actionable, and maintain Respectful tone throughout.",
    },
  ];
  return (
    <div id="tips" className="py-6">
      <h2 className="text-3xl font-bold mb-6">Tips for working with the bot</h2>

      {/* Mnemonics Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border border-blue-200">
        <h3 className="text-xl font-bold text-blue-800 mb-4">
          🧠 Memory Aids: Common Mnemonics for Heritage Assessment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p>
              <strong>SMART:</strong> Specific, Measurable, Achievable,
              Relevant, Time-bound
            </p>
            <p>
              <strong>PEACE:</strong> Prepare, Engage, Account, Closure,
              Evaluate
            </p>
            <p>
              <strong>VALUE:</strong> Vision, Assets, Legacy, Understanding,
              Expression
            </p>
          </div>
          <div>
            <p>
              <strong>CORE:</strong> Context, Objects, Relationships, Evolution
            </p>
            <p>
              <strong>CLEAR:</strong> Concise, Logical, Engaging, Actionable,
              Respectful
            </p>
          </div>
        </div>
      </div>

      <div className="card-grid mb-4">
        {tipsList.map((t) => (
          <div key={t.title} className="bg-white p-4 rounded shadow">
            <h3 className="font-bold text-blue-600">{t.title}</h3>
            <p>{t.text}</p>
          </div>
        ))}
      </div>
      <AiSpot
        spotId="tips"
        onQuery={(q) => askTipsLLM(q, tipsList)}
        exampleQueries={["Give me a prompt template for step 1"]}
      />
    </div>
  );
};

const IdeasPage: React.FC = () => {
  const ideasList = [
    {
      title: "Interactive timeline",
      text: "Show assets on a time axis with filters.",
    },
    {
      title: "Spatial value mapping",
      text: "Interactive heatmap of values across sites.",
    },
    {
      title: "Social media sentiment analysis",
      text: "Ask the bot to search the web for posts about your heritage place and analyze sentiments, emotional connections, and sense of place expressions from visitors and locals.",
    },
    {
      title: "Visual significance analysis",
      text: "Upload photos and ask the bot to identify visual significances, symbolic elements, and semiotic meanings derived from architectural details, spatial relationships, and material expressions.",
    },
    {
      title: "Context-effect visualization",
      text: "Generate dynamic diagrams showing how values arise from contexts and how the asset reinforces or reframes those contexts — the core CBSA principle.",
    },
    {
      title: "Comparative assessment matrix",
      text: "Create structured comparison tables using CBSA criteria (Period, Rarity, Documentation, Ensemble, Condition) to systematically evaluate your asset against similar heritage sites.",
    },
  ];
  return (
    <div id="ideas" className="py-6">
      <h2 className="text-3xl font-bold mb-6">Brainstorm: ideas to continue</h2>
      <div className="card-grid mb-4">
        {ideasList.map((i) => (
          <div key={i.title} className="bg-white p-4 rounded shadow">
            <h3 className="font-bold text-green-600">{i.title}</h3>
            <p>{i.text}</p>
          </div>
        ))}
      </div>
      <AiSpot
        spotId="ideas"
        onQuery={(q) => askBrainstormLLM(q, ideasList)}
        exampleQueries={["Suggest an interactive timeline feature"]}
      />
    </div>
  );
};

const DashboardPage: React.FC<any> = ({
  allGraphData = {},
  allGrapheCleanData = { nodes: [], edges: [] },
  thematicGraphData = { nodes: [], edges: [] },
  nodeColors = {},
}) => {
  return (
    <div id="dashboard" className="py-6">
      <h2 className="text-2xl font-bold mb-2">Knowledge Graphs</h2>
      <p className="text-gray-600 mb-4">
        Graphs below show knowledge networks built from workshop assessments.
      </p>
      <ImprovedGraphDashboard
        allGraphData={allGraphData}
        allGrapheCleanData={allGrapheCleanData}
        thematicGraphData={thematicGraphData}
        nodeColors={nodeColors}
      />
    </div>
  );
};

const App: React.FC = () => {
  const [page, setPage] = useState("home-en");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState({
    allGraphData: {},
    allGrapheCleanData: { nodes: [], edges: [] },
    thematicGraphData: { nodes: [], edges: [] },
    nodeColors: {},
  });

  useEffect(() => {
    async function loadData() {
      try {
        const base = import.meta.env.BASE_URL ?? "/";
        const [graphRes, thematicRes, allGrapheCleanRes] = await Promise.all([
          fetch(`${base}data/graphData.json`),
          fetch(`${base}data/thematicGraph.json`),
          fetch(`${base}data/allGrapheClean.json`),
        ]);
        if (!graphRes.ok || !thematicRes.ok || !allGrapheCleanRes.ok)
          throw new Error("Network error");
        const graphJson = await graphRes.json();
        const thematicJson = await thematicRes.json();
        const allGrapheCleanJson = await allGrapheCleanRes.json();
        setData({
          nodeColors: graphJson.NODE_COLORS ?? {},
          allGraphData: graphJson.allGraphData ?? {},
          allGrapheCleanData: allGrapheCleanJson,
          thematicGraphData: thematicJson,
        });
      } catch (e) {
        console.error(e);
        setError("Failed to load graph data.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // fade animation state
  const [fade, setFade] = useState(true);
  const [displayedPage, setDisplayedPage] = useState(page);
  useEffect(() => {
    if (page !== displayedPage) {
      setFade(false);
      const t = setTimeout(() => {
        setDisplayedPage(page);
        setFade(true);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [page, displayedPage]);

  // Sync page with URL hash so links like #tips or #ideas work
  useEffect(() => {
    const fromHash = (window.location.hash || "").replace(/^#/, "");
    if (fromHash && navItems.some((n) => n.id === fromHash)) {
      setPage(fromHash);
    }

    const onHash = () => {
      const h = (window.location.hash || "").replace(/^#/, "");
      if (h && navItems.some((n) => n.id === h)) setPage(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Update URL hash when page changes
  useEffect(() => {
    if (page && window.location.hash.replace(/^#/, "") !== page) {
      try {
        history.replaceState(null, "", `#${page}`);
      } catch (e) {
        window.location.hash = page;
      }
    }
  }, [page]);

  const pageProps = {
    allGraphData: data.allGraphData,
    allGrapheCleanData: data.allGrapheCleanData,
    thematicGraphData: data.thematicGraphData,
    nodeColors: data.nodeColors,
  };

  const renderPage = () => {
    if (loading) return <div className="text-center p-10">Loading data...</div>;
    if (error)
      return (
        <div className="text-center p-10 text-red-500 bg-red-100 rounded-md">
          {error}
        </div>
      );
    switch (displayedPage) {
      case "home-en":
        return <HomePageEn />;
      case "hands-on-1":
        return <ExperiencePageEn />;
      case "hands-on-2":
        return <HandsOn2Page />;
      case "discussion":
        return <DiscussionPage />;
      case "tips":
        return <TipsPage />;
      case "ideas":
        return <IdeasPage />;
      case "kg-map":
        return <KGMapPage />;
      case "dashboard":
        return <DashboardPage {...pageProps} />;
      case "workshop-report":
        return <WorkshopReport />;
      default:
        return <HomePageEn />;
    }
  };

  // inject minimal fade styles once
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("fade-style")) return;
    const s = document.createElement("style");
    s.id = "fade-style";
    s.innerHTML = `
      .fade-transition { transition: opacity 0.2s ease-in-out; }
      .fade-in { opacity: 1; }
      .fade-out { opacity: 0; }
      nav .nav-button { padding: 8px 12px; border-radius: 6px; border: none; background: transparent; cursor: pointer; }
      nav .nav-button.active { background: #e6f0ff; }
    `;
    document.head.appendChild(s);
  }, []);

  return (
    <ErrorBoundary>
      <div dir="ltr">
        <nav className="bg-white shadow-md px-4 py-2 flex justify-center gap-2 sticky top-0 z-50 overflow-x-auto">
          {navItems
            .filter((i) => i.visible !== false)
            .map((i) => (
              <a
                key={i.id}
                href={`#${i.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setPage(i.id);
                }}
                className={`nav-button ${page === i.id ? "active" : ""}`}
              >
                {i.label}
              </a>
            ))}
        </nav>

        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className={`fade-transition ${fade ? "fade-in" : "fade-out"}`}>
            <div className="page active">{renderPage()}</div>
          </div>
        </main>

        <footer className="site-footer text-center py-6">
          <p>
            © Cultural Insights Workshop, Cipa 2025 Dr. Yael Alef and Yuval
            Shafriri.
          </p>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default App;
