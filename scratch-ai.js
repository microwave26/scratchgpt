
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
          text: "ask AI [QUESTION] as user [USERNAME]",
          arguments: {
            QUESTION: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: "Hello!"
            },
            USERNAME: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: "player"
            }
          }
        },
        {
          opcode: "getHistory",
          blockType: Scratch.BlockType.REPORTER,
          text: "AI chat history for user [USERNAME]",
          arguments: {
            USERNAME: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: "player"
            }
          }
        },
        {
          opcode: "resetAI",
          blockType: Scratch.BlockType.REPORTER,
          text: "reset AI memory for user [USERNAME]",
          arguments: {
            USERNAME: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: "player"
            }
          }
        }
      ]
    };
  }

  getSessionId(username) {
    const name = String(username || "guest")
      .trim()
      .slice(0, 80);

    return "scratchgpt:" + (name || "guest");
  }

  async post(path, body) {
    const response = await fetch(`${SERVER_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

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
        sessionId: this.getSessionId(args.USERNAME)
      });

      return data.answer || "The AI returned an empty answer.";
    } catch (error) {
      console.error("ScratchGPT:", error);
      return error.message || "Could not contact ScratchGPT.";
    }
  }

  async getHistory(args) {
    try {
      const data = await this.post("/history", {
        sessionId: this.getSessionId(args.USERNAME)
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

  async resetAI(args) {
    try {
      const data = await this.post("/reset", {
        sessionId: this.getSessionId(args.USERNAME)
      });

      return data.message || "Memory cleared!";
    } catch (error) {
      console.error("ScratchGPT:", error);
      return "Could not reset memory. Check the server.";
    }
  }
}

Scratch.extensions.register(new ScratchAI());
