from google import genai
from src.core.config import Config
class GenericLLM:
    def __init__(self, model_name: str, api_key: str):
        self.model_name = model_name
        self.api_key = api_key
        self.client = genai.Client(api_key=Config.GOOGLE_API_KEY)
        
    def handle_llm_request(self, context: any):
        response = self.client.models.generate_content(model=self.model_name, contents=context)
        return response.text
    
    