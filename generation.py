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


class PromptRequest(BaseModel):
    prompt: str


class ConversationHistory(BaseModel):
    history: list


def generate_system_prompt(
    cuisine_type: str, recipe_type: str, fridge_items: dict
) -> str:

    if recipe_type == "Menü":
        return f"""
        Sen, verilen buzdolabı malzemelerine dayanarak {cuisine_type} mutfağından bir menü oluşturan yardımcı bir asistansın. 
        Menüde ana yemek, meze, tatlı ve yan yemek isimleri ve kısa açıklamalar olmalı. Mutfağın tipine göre popüler ve bilinen yemek isimleri söyle. 
        Her yemek ismi için sadece bir cümlelik kısa bir açıklama yaz. Tarif detaylarına girme. Sadece buzdolabından malzemeler kullan.
        Olmayan malzemeyi kullanma. Yeterince malzeme yoksa az sayıda yemek önerebilirsin.
        Buzdolabındaki malzemeler: {fridge_items}
        """
    else:
        return f"""
        Sen, verilen buzdolabı malzemelerine dayanarak {cuisine_type} mutfağından {recipe_type} yemek isimleri ve kısa açıklamalar oluşturan yardımcı bir asistansın. 
        Mutfağın tipine göre popüler ve bilinen yemek isimleri söyle. Eğer malzemeler yeterince çeşitli ise maksimum 3 adet yemek ismi ve kısa açıklama oluşturabilirsin. 
        Her yemek ismi için sadece bir cümlelik kısa bir açıklama yaz. Tarif detaylarına girme. Sadece buzdolabından malzemeler kullan.
        Olmayan malzemeyi kullanma. Yeterince malzeme yoksa az sayıda yemek önerebilirsin.
        Buzdolabındaki malzemeler: {fridge_items}
        """


def generate_recipes_chatgpt(prompt: str, system_prompt: str):
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


def generate_recipes(fridge_items: dict, cuisine_type: str, recipe_type: str) -> str:
    system_prompt = generate_system_prompt(cuisine_type, recipe_type, fridge_items)
    prompt = f"Yeterince malzeme var ise, üç farklı(yoksa olduğu kadar) {recipe_type} türkçe yemek ismini, parantez içinde (orjinal ismini) ve kısa açıklama oluştur."
    gemini_recipes = generate_recipes_gemini(prompt, system_prompt)
    return f"## {cuisine_type} {recipe_type} Yemek İsimleri ve Açıklamaları\n\n{gemini_recipes}"


def generate_menu(fridge_items: dict, cuisine_type: str) -> str:
    system_prompt = generate_system_prompt(cuisine_type, "Menü", fridge_items)
    prompt = "Bir menü oluştur."
    gemini_menu = generate_recipes_gemini(prompt, system_prompt)
    return f"## {cuisine_type} Menüsü\n\n{gemini_menu}"


def generate_shopping_prompt(fridge_items: str, days: int) -> str:
    return f"""
    Sen, verilen buzdolabı malzemelerine bakarak {days} günlük yemek planı için eksik malzemeleri tespit eden bir asistansın.
    Temel mutfak malzemeleri (tuz, şeker, un gibi) hariç, buzdolabında olmayan ama gerekebilecek malzemeleri kategorilerine göre gruplandırarak liste halinde öner.
    Her kategori altında en fazla 5 önemli malzeme olsun.
    
    Buzdolabındaki malzemeler:
    {fridge_items}
    
    Output Format : 
    Sebze :
    Meyve:
    Et ürünleri:
    Tahıl :
    Yağ ve Baharat:
    Süt Ürünleri
    Diğer :
    """


def generate_shopping_list(fridge_items: str, days: int) -> str:
    system_prompt = generate_shopping_prompt(fridge_items, days)
    prompt = f"{days} günlük yemek planı için alışveriş listesi oluştur. Kategorilere ayır (örn: Sebzeler, Meyveler, Et Ürünleri, Süt Ürünleri)"
    shopping_list = generate_recipes_gemini(prompt, system_prompt)
    return f"## {days} Günlük Alışveriş Listesi\n\n{shopping_list}"
