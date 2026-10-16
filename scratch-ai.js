
// Replace this with your deployed Render URL.
// Example: https://your-scratchgpt.onrender.com
const SERVER_URL = "https://scratchgpt-sjou.onrender.com";

class ScratchAI {

  getInfo() {
    return {
      id: "microwave26ai",
      name: "Scratch AI",
      color1: "#7B61FF",
      color2: "#6548E8",
      blocks: [
        {
          opcode: "askAI",
          blockType: Scratch.BlockType.REPORTER,
          text: "ask AI [QUESTION]",
          arguments: {
            QUESTION: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: "Hello!"
            }
          }
        },
        {
          opcode: "getHistory",
          blockType: Scratch.BlockType.REPORTER,
          text: "AI chat history"
        },
        {
          opcode: "resetAI",
          blockType: Scratch.BlockType.REPORTER,
          text: "reset AI memory and wait"
        }
      ]
    };
  }

  async post(path, body) {
    const response = await fetch(
      `${SERVER_URL}${path}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Server request failed.");
    }

    return data;
  }

  async askAI(args) {
    try {
      const data = await this.post("/chat", {
        question: args.QUESTION,
        sessionId: "microwave26-scratch"
      });

      return data.answer || "The AI returned an empty answer.";
    } catch (error) {
      console.error("ScratchGPT:", error);
      return "Could not contact ScratchGPT. Check the server URL and deployment.";
    }
  }

  async getHistory() {
    try {
      const data = await this.post("/history", {
        sessionId: "microwave26-scratch"
      });

      if (!data.history || data.history.length === 0) {
        return "No chat history yet!";
      }

      return data.history.map(message => {
        const speaker = message.role === "user" ? "You" : "AI";
        return speaker + ": " + message.content;
      }).join("\n\n");
    } catch (error) {
      console.error("ScratchGPT:", error);
      return "Could not load chat history.";
    }
  }

  async resetAI() {
    try {
      const data = await this.post("/reset", {
        sessionId: "microwave26-scratch"
      });

      return data.message || "Memory cleared!";
    } catch (error) {
      console.error("ScratchGPT:", error);
      return "Could not reset memory. Check the server.";
    }
  }
}

Scratch.extensions.register(new ScratchAI());
