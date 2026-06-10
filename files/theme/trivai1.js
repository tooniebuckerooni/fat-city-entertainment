// Function to generate trivia questions
async function generateTrivia(title, categories, questionsPerCategory) {
    try {
        // Make AJAX request to fetch API key from server
        const apiKeyResponse = await fetch('/api-key');
	const responseData = await apiKeyResponse.json();
        const apiKey = data.apiKey;

        // Define API endpoint and parameters
        const apiEndpoint = 'https://api.openai.com/v1/engines/davinci-codex/completions';
        const prompt = `Generate trivia questions for "${title}" across ${categories} categories with ${questionsPerCategory} questions each.`;
        const maxTokens = 200;

        // Define headers for API request
        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };

        // Define body of API request
        const body = {
            'prompt': prompt,
            'max_tokens': maxTokens
        };

        // Make API request
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        const data = await response.json();

        // Extract generated trivia questions from API response
        const questions = data.choices.map(choice => choice.text.trim());

        // Display generated trivia questions
        displayTrivia(questions);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Function to display trivia questions
function displayTrivia(questions) {
    // Display questions on the webpage
    const triviaContent = document.getElementById('trivia-content');
    triviaContent.innerHTML = ''; // Clear previous content

    questions.forEach((question, index) => {
        const p = document.createElement('p');
        p.textContent = `Question ${index + 1}: ${question}`;
        triviaContent.appendChild(p);
    });

    // Display download button
    document.getElementById('download-btn').style.display = 'block';
}

// Event listener for form submission
document.getElementById('trivia-form').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent the form from submitting normally

    // Get input values from the form
    const title = document.getElementById('title').value;
    const categories = parseInt(document.getElementById('categories').value);
    const questionsPerCategory = parseInt(document.getElementById('questions').value);

    // Generate trivia questions
    await generateTrivia(title, categories, questionsPerCategory);
});

// Event listener for download button click
document.getElementById('download-btn').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent the button from submitting the form

    // Call the function to download the trivia as a PDF
    downloadTriviaPDF();
});

// Function to download trivia as a PDF
function downloadTriviaPDF() {
    // Implement PDF download functionality
    // This function will depend on the specific PDF generation library or method you choose to use.
}
