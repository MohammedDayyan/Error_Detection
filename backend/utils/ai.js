const { Groq } = require('groq-sdk');
const { promisify } = require('util');
const { execFile } = require('child_process');
const path = require('path');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const execFileAsync = promisify(execFile);

function parseResponseText(responseText) {
    let explanation = "Explanation could not be generated.";
    let fix = "Fix could not be generated.";

    if (responseText.includes('EXPLANATION:') && responseText.includes('FIX:')) {
        const parts = responseText.split('FIX:');
        explanation = parts[0].replace('EXPLANATION:', '').trim();
        fix = parts[1].trim();
    } else {
        explanation = responseText || explanation;
        fix = "Please see explanation.";
    }

    return { explanation, fix };
}

async function getAIFixFromPython(errorMessage, fileContext) {
    const scriptPath = path.join(__dirname, 'ai_fix.py');
    const payload = JSON.stringify({
        errorMessage,
        fileContext,
        apiKey: process.env.GROQ_API_KEY
    });
    const commands = [
        { cmd: 'python', args: [scriptPath, payload] },
        { cmd: 'py', args: ['-3', scriptPath, payload] }
    ];

    let lastError;

    for (const command of commands) {
        try {
            const { stdout } = await execFileAsync(command.cmd, command.args, {
                windowsHide: true,
                timeout: 60000,
                maxBuffer: 1024 * 1024
            });
            const parsed = JSON.parse(stdout);
            if (!parsed.explanation || !parsed.fix) {
                throw new Error('Python helper returned incomplete response.');
            }
            return parsed;
        } catch (err) {
            lastError = err;
        }
    }

    throw new Error(`Python helper failed. ${lastError?.stderr || lastError?.message || ''}`.trim());
}

async function getAIFixFromNode(errorMessage, fileContext) {
    const prompt = `You are an expert AI debugging assistant. I have encountered the following error in my logs:
        
Error Message:
${errorMessage}

Context/File:
${fileContext}

Please provide:
1. A brief explanation of why this error likely occurred.
2. A suggested fix or steps to resolve it.

Format your response exactly as follows:
EXPLANATION:
<your explanation here>
FIX:
<your fix here>
`;

    const messages = [
        {
            role: "system",
            content: "You are a helpful and expert AI debugging assistant."
        },
        {
            role: "user",
            content: prompt
        }
    ];

    const candidateModels = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768"
    ];

    let chatCompletion;
    let lastError;

    for (const model of candidateModels) {
        try {
            chatCompletion = await groq.chat.completions.create({
                messages,
                model,
                temperature: 0.2,
                max_tokens: 1024
            });
            break;
        } catch (modelErr) {
            lastError = modelErr;
        }
    }

    if (!chatCompletion) {
        throw lastError || new Error("No Groq model could generate a response.");
    }

    const responseText = chatCompletion.choices[0]?.message?.content || "";
    return parseResponseText(responseText);
}

async function getAIFix(errorMessage, fileContext) {
    try {
        try {
            return await getAIFixFromPython(errorMessage, fileContext);
        } catch (pythonError) {
            console.warn("Python AI helper failed, falling back to Node SDK:", pythonError.message);
            return await getAIFixFromNode(errorMessage, fileContext);
        }
    } catch (error) {
        console.error("Error communicating with Groq API:", error);
        const providerMessage = error?.response?.data?.error?.message || error?.message;
        throw new Error(`Failed to generate AI fix from Groq. ${providerMessage || ''}`.trim());
    }
}

module.exports = { getAIFix };
