# app.py

import logging
import os
from dotenv import load_dotenv
from pydantic import BaseModel
import google.generativeai as genai
from openai import OpenAI

load_dotenv()

genai.configure(api_key=os.environ["API_KEY"])

client = OpenAI()

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

system_prompt = """
Sen, verilen buzdolabı malzemelerine dayanarak tarifler oluşturan yardımcı bir asistansın.
"""


class PromptRequest(BaseModel):
    prompt: str


def generate_recipes_chatgpt(prompt: str):
    response = client.chat.completions.create(
        model="gpt-4o-mini-2024-07-18",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
    )
    content = response.choices[0].message.content
    return content


def generate_recipes_gemini(prompt: str, system_prompt: str):
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=system_prompt,
    )
    content = model.generate_content(prompt).text
    return content
