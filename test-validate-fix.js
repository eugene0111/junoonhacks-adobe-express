import axios from "axios";

const API_URL = "http://localhost:3000";

async function testValidateWithFix() {
  console.log("Testing /api/validate endpoint...");

  const payload = {
    brand_profile: {
      fonts: {
        heading: "Roboto",
        body: "Open Sans",
        h1_size: 32,
        h2_size: 24,
        h3_size: 20,
        body_size: 16,
        caption_size: 12,
      },
      colors: {
        primary: "#FF0000",
        secondary: "#00FF00",
        text: "#000000",
        background: "#FFFFFF",
      },
      spacing: {
        padding: 10,
        margin: 10,
        gap: 10,
      },
    },
    document_data: {
      elements: [
        {
          id: "1",
          type: "text",
          textStyle: {
            fontFamily: "Comic Sans MS", // Violation
            fontSize: 15, // Violation (close to 16)
            color: "#0000FF", // Violation
          },
        },
      ],
    },
  };

  try {
    const response = await axios.post(`${API_URL}/brand/validate`, payload);
    console.log("Response Status:", response.status);
    console.log("Success:", response.data.success);

    if (response.data.violations) {
      console.log("Violations Found:", response.data.violations.length);
      response.data.violations.forEach((v) =>
        console.log(`- ${v.message} (${v.severity})`)
      );
    }

    if (response.data.fix_plan) {
      console.log("\nFix Plan Found!");
      console.log("Number of Actions:", response.data.fix_plan.actions.length);
      response.data.fix_plan.actions.forEach((action) => {
        console.log(`- Action: ${action.action}`);
        console.log(`  Description: ${action.description}`);
        console.log(`  Payload:`, JSON.stringify(action.payload));
      });
    } else {
      console.error("\nFAIL: No fix_plan found in response.");
    }
  } catch (error) {
    console.error("Error testing API:", error.message);
    if (error.response) {
      console.error("Response Data:", error.response.data);
    }
  }
}

testValidateWithFix();
