import React, { useState } from 'react';

interface AiSpotProps {
    spotId: string;
    onQuery: (input: string) => Promise<string>;
    placeholder?: string;
    exampleQueries?: string[];
}

const AiSpot: React.FC<AiSpotProps> = ({ spotId, onQuery, exampleQueries }) => {
    const [input, setInput] = useState<string>('');
    const [output, setOutput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const config = {
        tips: {
            title: 'Ask the bot for more tips',
            description: 'Want a specific tip? Ask the bot to expand on a topic or provide a new tip.',
            placeholder: 'Example: Give me a tip on writing prompts...'
        },
        ideas: {
            title: 'Ask the bot for more ideas',
            description: 'Need inspiration? Ask the bot for a new idea based on existing ones.',
            placeholder: 'Example: Suggest an idea combining maps and timeline...'
        },
        dashboard: {
            title: '',
            description: '',
            placeholder: 'Ask the bot about the asset – get explanations on connections and values…'
        }
    }[spotId] ?? {
        title: '',
        description: '',
        placeholder: ''
    };

    const handleAsk = async (customInput?: string) => {
        const q = typeof customInput === 'string' ? customInput : input;
        if (!q.trim() || isLoading) return;
        setIsLoading(true);
        setOutput('Sending query to Gemini...');
        try {
            const answer = await onQuery(q);
            setOutput(answer);
        } catch (error) {
            console.error("AI Query Error:", error);
            setOutput('Error getting response from bot.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleAsk();
        }
    };

    return (
        <div className="ai-spot mt-2">
            <div className="flex items-baseline gap-2 mb-2">
                <h4 className="font-bold text-lg text-blue-800">{config.title}</h4>
                <p className="text-sm text-gray-600">{config.description}</p>
            </div>
            <div className="flex flex-col gap-3 mt-2">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={config.placeholder}
                        className="flex-grow p-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        disabled={isLoading}
                    />
                    <button
                        onClick={() => handleAsk()}
                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none min-w-[80px]"
                        disabled={isLoading || !input.trim()}
                    >
                        {isLoading ? '⏳ Loading...' : '🚀 Ask'}
                    </button>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span>💡 Tip:</span>
                    <span>Press Enter to submit your question quickly</span>
                </div>
                {exampleQueries && exampleQueries.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs text-gray-600 self-center">Quick examples:</span>
                        {exampleQueries.map((q, i) => (
                            <button
                                key={i}
                                className="px-3 py-1.5 rounded-full border text-xs bg-gray-50 border-gray-300 hover:bg-blue-50 hover:border-blue-300 transition-colors duration-200"
                                onClick={() => handleAsk(q)}
                                disabled={isLoading}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {output && (
                <div className="p-4 mt-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 min-h-[60px] whitespace-pre-wrap shadow-sm">
                    {output}
                </div>
            )}
        </div>
    );
};

export default AiSpot;