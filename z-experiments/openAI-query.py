import openai

openai.organization = "org-rXissV6mxEObfLzeQ9FunQyE"
openai.api_key = "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"
openai.Model.list()

permanentPrompt = "You are a financial risk analysis agent. Your job is to give advice to people about their financial portfolios. Answer the following question: "
variablePrompt = "Should I invest in water futures?"

inputText = permanentPrompt + variablePrompt
#Query the API
response = openai.Completion.create(
engine="text-davinci-003",
prompt=inputText,
temperature=0,
max_tokens=150,

)
print(f"input: {inputText}")
print(f"response:")
query = response.choices[0].text
print(query)