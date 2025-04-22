import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

// Emotion/tone detection keywords
const EMOTION_KEYWORDS = {
  EXCITED: [
    "excited",
    "amazing",
    "wow",
    "incredible",
    "awesome",
    "!",
    "omg",
    "bullish",
  ],
  SERIOUS: [
    "analysis",
    "research",
    "important",
    "attention",
    "beware",
    "warning",
    "risk",
  ],
  TECHNICAL: [
    "code",
    "protocol",
    "algorithm",
    "function",
    "development",
    "technical",
    "blockchain",
  ],
  CELEBRATORY: [
    "congrats",
    "congratulations",
    "achievement",
    "milestone",
    "launch",
    "success",
  ],
  QUESTION: [
    "?",
    "how",
    "why",
    "what",
    "when",
    "where",
    "who",
    "which",
    "question",
  ],
  ANNOUNCEMENT: [
    "announcement",
    "announcing",
    "released",
    "introducing",
    "new",
    "update",
  ],
};

// Style suggestions based on message tone/content
const STYLE_SUGGESTIONS = {
  EXCITED: [
    {
      name: "Energetic Announcement",
      description: "Vibrant gradient with bold text that captures attention",
      style: {
        gradient: "linear-gradient(135deg, #ff00ff, #00ffff)",
        textColor: "#ffffff",
        fontFamily: "'Poppins', sans-serif",
        fontWeight: "bold",
        animationType: "pulse",
      },
    },
    {
      name: "Bullish Green",
      description: "Optimistic style for positive market sentiment",
      style: {
        gradient: "linear-gradient(135deg, #00b09b, #96c93d)",
        textColor: "#ffffff",
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: "bold",
      },
    },
  ],
  SERIOUS: [
    {
      name: "Professional Alert",
      description: "Clean, serious style for important information",
      style: {
        gradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
        textColor: "#4da8da",
        fontFamily: "'Space Grotesk', sans-serif",
      },
    },
    {
      name: "Warning Style",
      description: "High contrast style for important warnings",
      style: {
        bgColor: "#262626",
        textColor: "#ff4545",
        fontFamily: "'Roboto', sans-serif",
        fontWeight: "bold",
      },
    },
  ],
  TECHNICAL: [
    {
      name: "Code View",
      description: "Monospace font with terminal-like appearance",
      style: {
        bgColor: "#121212",
        textColor: "#32cb65",
        fontFamily: "'Fira Code', monospace",
        fontSize: "0.9rem",
      },
    },
    {
      name: "Matrix Code",
      description: "Retro digital style for technical discussions",
      style: {
        bgColor: "rgba(0, 10, 2, 0.85)",
        textColor: "#0f0",
        fontFamily: "'Courier New', monospace",
        textEffect: "matrix",
      },
    },
  ],
  CELEBRATORY: [
    {
      name: "Celebration",
      description: "Festive style for achievements and milestones",
      style: {
        gradient: "linear-gradient(135deg, #5433ff, #20bdff, #a5fecb)",
        textColor: "#ffffff",
        fontFamily: "'Pacifico', cursive",
        animationType: "rainbow",
      },
    },
    {
      name: "Golden Achievement",
      description: "Premium gold style for major accomplishments",
      style: {
        gradient: "linear-gradient(135deg, #f7931a, #f4ba36, #ffd700)",
        textColor: "#000000",
        fontFamily: "'Playfair Display', serif",
        fontWeight: "bold",
        textEffect: "metallic",
      },
    },
  ],
  QUESTION: [
    {
      name: "Curious Mind",
      description: "Thoughtful style for questions and inquiries",
      style: {
        gradient: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
        textColor: "#7affaf",
        fontFamily: "'Nunito', sans-serif",
      },
    },
    {
      name: "Question Highlight",
      description: "Style that emphasizes questions",
      style: {
        bgColor: "#302b63",
        textColor: "#f8f8f2",
        fontFamily: "'Raleway', sans-serif",
        fontStyle: "italic",
      },
    },
  ],
  ANNOUNCEMENT: [
    {
      name: "Official Announcement",
      description: "Professional style for formal announcements",
      style: {
        gradient: "linear-gradient(135deg, #3a1c71, #d76d77, #ffaf7b)",
        textColor: "#ffffff",
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: "bold",
        textEffect: "shadow",
      },
    },
    {
      name: "Attention Grabber",
      description: "Visually distinct style for key announcements",
      style: {
        gradient: "linear-gradient(135deg, #9945FF, #14F195)",
        textColor: "#ffffff",
        fontFamily: "'Poppins', sans-serif",
        fontWeight: "bold",
        animationType: "pulse",
      },
    },
  ],
};

export async function POST(request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      message,
      analysis,
      currentStyle,
      userPreferences,
      userThemes,
      userRank,
      defaultThemes,
    } = body;

    if (!message) {
      return NextResponse.json(
        {
          error: "Message is required for style suggestions",
        },
        { status: 400 }
      );
    }

    // AI-generated suggestions based on comprehensive analysis
    const suggestions = generateSmartSuggestions({
      message,
      analysis,
      currentStyle,
      userPreferences,
      userThemes,
      userRank,
      defaultThemes,
    });

    return NextResponse.json({
      suggestions,
      analysisResults: analysis,
    });
  } catch (error) {
    console.error("Error generating style suggestions:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Comprehensive suggestion generator
function generateSmartSuggestions({
  message,
  analysis,
  currentStyle,
  userPreferences,
  userThemes,
  userRank,
  defaultThemes,
}) {
  const suggestions = [];
  const contentType = analysis.contentType.primaryType;
  const sentiment = analysis.sentiment;

  // 1. Generate message context-specific suggestions
  const contextSuggestions = generateContextSuggestions(
    contentType,
    sentiment,
    analysis
  );
  suggestions.push(...contextSuggestions);

  // 2. Generate suggestions based on user themes
  if (userThemes && userThemes.length > 0) {
    const themeSuggestions = generateUserThemeSuggestions(
      userThemes,
      contentType,
      sentiment,
      message
    );
    suggestions.push(...themeSuggestions);
  }

  // 3. Generate suggestions based on default themes that match well
  const defaultThemeSuggestions = generateDefaultThemeSuggestions(
    defaultThemes,
    contentType,
    sentiment
  );
  suggestions.push(...defaultThemeSuggestions);

  // 4. Generate font and animation suggestions based on content
  if (userRank <= 500) {
    // Can use fonts
    const fontSuggestions = generateFontSuggestions(
      contentType,
      sentiment,
      analysis
    );
    suggestions.push(...fontSuggestions);
  }

  // 5. Generate special effect suggestions for elite users
  if (userRank <= 100) {
    // Can use animations and effects
    const effectSuggestions = generateEffectSuggestions(
      contentType,
      sentiment,
      analysis
    );
    suggestions.push(...effectSuggestions);
  }

  // 6. Sort by relevance and take top suggestions
  suggestions.forEach((suggestion) => {
    // Ensure each suggestion has a match score
    if (!suggestion.matchScore) {
      suggestion.matchScore = 0.7 + Math.random() * 0.3; // Default random score
    }
  });

  // Sort by match score and return top N
  return suggestions.sort((a, b) => b.matchScore - a.matchScore).slice(0, 6); // Return top 6 suggestions
}

// Generate suggestions based on message context
function generateContextSuggestions(contentType, sentiment, analysis) {
  const suggestions = [];

  // Handle different content types
  switch (contentType) {
    case "announcement":
      suggestions.push({
        name: "Official Announcement",
        description: "Professional style for important news",
        matchScore: 0.92,
        style: {
          gradient: "linear-gradient(135deg, #3a1c71, #d76d77, #ffaf7b)",
          textColor: "#ffffff",
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: "bold",
        },
      });

      if (sentiment.isPositive) {
        suggestions.push({
          name: "Exciting News",
          description: "Vibrant colors for positive announcements",
          matchScore: 0.89,
          style: {
            gradient: "linear-gradient(135deg, #00c6ff, #0072ff)",
            textColor: "#ffffff",
            fontFamily: "'Poppins', sans-serif",
            fontWeight: "bold",
            animationType: "pulse",
          },
        });
      }
      break;

    case "question":
      suggestions.push({
        name: "Curious Question",
        description: "Style that highlights inquiries",
        matchScore: 0.94,
        style: {
          gradient: "linear-gradient(135deg, #654ea3, #eaafc8)",
          textColor: "#ffffff",
          fontFamily: "'Nunito', sans-serif",
          fontStyle: "italic",
        },
      });
      break;

    case "trading":
      if (sentiment.isPositive) {
        suggestions.push({
          name: "Bullish Analysis",
          description: "Green-themed style for positive market sentiment",
          matchScore: 0.95,
          style: {
            gradient: "linear-gradient(135deg, #184e68, #57ca85)",
            textColor: "#ffffff",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: "bold",
          },
        });
      } else if (sentiment.isNegative) {
        suggestions.push({
          name: "Bearish Analysis",
          description: "Red-themed style for negative market sentiment",
          matchScore: 0.95,
          style: {
            gradient: "linear-gradient(135deg, #29323c, #485563)",
            textColor: "#ff4545",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: "bold",
          },
        });
      } else {
        suggestions.push({
          name: "Market Analysis",
          description: "Professional style for market discussions",
          matchScore: 0.9,
          style: {
            gradient: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
            textColor: "#7acdff",
            fontFamily: "'Space Grotesk', sans-serif",
          },
        });
      }
      break;

    case "technical":
      suggestions.push({
        name: "Code Block",
        description: "Monospace style for technical content",
        matchScore: 0.96,
        style: {
          bgColor: "#1e1e1e",
          textColor: "#4ec9b0",
          fontFamily: "'Fira Code', monospace",
          fontSize: "0.9rem",
        },
      });

      if (analysis.containsCodeSnippet) {
        suggestions.push({
          name: "Dev Mode",
          description: "Terminal-inspired style for code snippets",
          matchScore: 0.95,
          style: {
            bgColor: "#000000",
            textColor: "#00ff00",
            fontFamily: "'Fira Code', monospace",
            textEffect: "matrix",
          },
        });
      }
      break;

    case "celebration":
      suggestions.push({
        name: "Achievement Unlocked",
        description: "Celebratory golden style for achievements",
        matchScore: 0.97,
        style: {
          gradient: "linear-gradient(135deg, #bc4e9c, #f80759)",
          textColor: "#ffffff",
          fontFamily: "'Poppins', sans-serif",
          fontWeight: "bold",
          animationType: "pulse",
        },
      });

      suggestions.push({
        name: "Victory Lap",
        description: "Animated celebratory style",
        matchScore: 0.93,
        style: {
          gradient: "linear-gradient(135deg, #5433ff, #20bdff, #a5fecb)",
          textColor: "#ffffff",
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: "bold",
          animationType: "rainbow",
        },
      });
      break;

    case "warning":
      suggestions.push({
        name: "Important Alert",
        description: "High-visibility style for warnings",
        matchScore: 0.98,
        style: {
          gradient: "linear-gradient(135deg, #434343, #000000)",
          textColor: "#ff4545",
          fontFamily: "'Roboto', sans-serif",
          fontWeight: "bold",
          textEffect: "shadow",
        },
      });
      break;

    default: // General - based more on sentiment
      if (sentiment.isPositive) {
        suggestions.push({
          name: "Optimistic",
          description: "Upbeat style for positive messages",
          matchScore: 0.85,
          style: {
            gradient: "linear-gradient(135deg, #2193b0, #6dd5ed)",
            textColor: "#ffffff",
            fontFamily: "'Poppins', sans-serif",
          },
        });
      } else if (sentiment.isNegative) {
        suggestions.push({
          name: "Serious Tone",
          description: "Subdued style for serious content",
          matchScore: 0.85,
          style: {
            gradient: "linear-gradient(135deg, #141e30, #243b55)",
            textColor: "#e0e0e0",
            fontFamily: "'Roboto', sans-serif",
          },
        });
      } else {
        suggestions.push({
          name: "Balanced",
          description: "Neutral, professional style",
          matchScore: 0.85,
          style: {
            gradient: "linear-gradient(135deg, #2c3e50, #4ca1af)",
            textColor: "#ffffff",
            fontFamily: "'Montserrat', sans-serif",
          },
        });
      }
      break;
  }

  // Special case for short messages
  if (analysis.length < 15) {
    suggestions.push({
      name: "Quick Note",
      description: "Clean style for short messages",
      matchScore: 0.88,
      style: {
        bgColor: "#2d3436",
        textColor: "#74b9ff",
        fontFamily: "'Nunito', sans-serif",
        fontSize: "1.1rem",
      },
    });
  }

  // Special case for long messages
  if (analysis.length > 80) {
    suggestions.push({
      name: "Reader-Friendly",
      description: "Comfortable style for longer content",
      matchScore: 0.87,
      style: {
        bgColor: "#2d3436",
        textColor: "#dfe6e9",
        fontFamily: "'Roboto', sans-serif",
        fontSize: "0.95rem",
        lineHeight: "1.5",
      },
    });
  }

  return suggestions;
}

// Generate suggestions based on user's custom themes
function generateUserThemeSuggestions(
  userThemes,
  contentType,
  sentiment,
  message
) {
  if (!userThemes || userThemes.length === 0) return [];

  const suggestions = [];

  // Get 1-2 user themes that could work well
  userThemes
    .slice(0, Math.min(2, userThemes.length))
    .forEach((theme, index) => {
      suggestions.push({
        name: `Your "${theme.name}" Theme`,
        description: "Based on your custom theme",
        matchScore: 0.85 - index * 0.05, // First theme gets higher score
        basedOn: theme.name,
        style: {
          ...(theme.gradient
            ? { gradient: theme.gradient }
            : { bgColor: theme.bgColor }),
          textColor: theme.textColor,
          // Optionally add other style properties based on message context
          ...(contentType === "technical"
            ? { fontFamily: "'Fira Code', monospace" }
            : {}),
          ...(sentiment.isPositive ? { fontWeight: "bold" } : {}),
        },
      });
    });

  return suggestions;
}

// Generate suggestions based on default themes
function generateDefaultThemeSuggestions(
  defaultThemes,
  contentType,
  sentiment
) {
  if (!defaultThemes) return [];

  const suggestions = [];

  // Map content types to appropriate default themes
  const themeMap = {
    announcement: ["Solana Wave", "Metaverse", "DeFi Protocol"],
    question: ["Night Trader", "Blockchain"],
    trading: ["Exchange", "Bitcoin Gold", "Bear Market"],
    technical: ["Blockchain", "Exchange"],
    celebration: ["Bitcoin Gold", "Metaverse", "Cyberpunk"],
    warning: ["Bear Market", "Default"],
    general: ["Default", "Ethereum", "NFT Gallery"],
  };

  // Get recommended theme names for this content
  const recommendedThemes = themeMap[contentType] || themeMap.general;

  // Find matching themes from the default themes
  recommendedThemes.forEach((themeName) => {
    const matchingTheme = defaultThemes.find((t) => t.name === themeName);
    if (matchingTheme) {
      suggestions.push({
        name: `${matchingTheme.name} Theme`,
        description: `Recommended theme for this content`,
        matchScore: 0.8 + Math.random() * 0.1,
        basedOn: matchingTheme.name,
        style: {
          ...(matchingTheme.gradient
            ? { gradient: matchingTheme.gradient }
            : { bgColor: matchingTheme.bgColor }),
          textColor: matchingTheme.textColor,
        },
      });
    }
  });

  return suggestions;
}

// Generate font suggestions based on content
function generateFontSuggestions(contentType, sentiment, analysis) {
  const suggestions = [];

  // Different font combinations for different contexts
  if (contentType === "technical") {
    suggestions.push({
      name: "Code Display",
      description: "Monospace font perfect for code and technical content",
      matchScore: 0.92,
      style: {
        fontFamily: "'Fira Code', monospace",
        fontSize: "0.9rem",
        bgColor: "#1e1e1e",
        textColor: "#4ec9b0",
      },
    });
  } else if (contentType === "celebration") {
    suggestions.push({
      name: "Celebration Text",
      description: "Fun, eye-catching font for celebrations",
      matchScore: 0.9,
      style: {
        fontFamily: "'Pacifico', cursive",
        fontSize: "1.2rem",
        gradient: "linear-gradient(135deg, #5433ff, #20bdff, #a5fecb)",
        textColor: "#ffffff",
      },
    });
  } else if (contentType === "announcement") {
    suggestions.push({
      name: "Announcement Style",
      description: "Clear, professional font for announcements",
      matchScore: 0.91,
      style: {
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: "bold",
        gradient: "linear-gradient(135deg, #3a1c71, #d76d77, #ffaf7b)",
        textColor: "#ffffff",
      },
    });
  }

  return suggestions;
}

// Generate effect suggestions for premium users
function generateEffectSuggestions(contentType, sentiment, analysis) {
  const suggestions = [];

  if (contentType === "technical" && analysis.containsCodeSnippet) {
    suggestions.push({
      name: "Matrix Code",
      description: "Digital rain effect for code snippets",
      matchScore: 0.94,
      style: {
        textEffect: "matrix",
        fontFamily: "'Fira Code', monospace",
        fontSize: "0.9rem",
        bgColor: "rgba(0, 10, 2, 0.85)",
        textColor: "#0f0",
      },
    });
  } else if (contentType === "celebration") {
    suggestions.push({
      name: "Celebration Effects",
      description: "Holographic effect for celebratory messages",
      matchScore: 0.93,
      style: {
        textEffect: "holographic",
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: "bold",
        animationType: "pulse",
      },
    });
  } else if (contentType === "announcement" && sentiment.isPositive) {
    suggestions.push({
      name: "Attention Grabber",
      description: "Glowing neon effect for important announcements",
      matchScore: 0.92,
      style: {
        textEffect: "neon",
        fontFamily: "'Poppins', sans-serif",
        fontWeight: "bold",
        bgColor: "#1a1a2e",
      },
    });
  }

  return suggestions;
}
