# app.py
import os
import requests
import logging
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


# Function to fetch fridge items from the fridge list app
def fetch_fridge_items():
    response = requests.get("http://localhost:5001/items")
    if response.status_code == 200:
        fridge_items = response.json()
        items_list = ""
        for ingredient in fridge_items.keys():
            items_list += ingredient + "\n"
            items_list += ",".join(fridge_items[ingredient]) + "\n"
        return items_list
    else:
        return {"error": "Failed to fetch fridge items"}


def get_system_prompt(fridge_items: dict) -> str:
    return f"""Sen, mutfak ve yemek konusunda yardımcı olan bir asistansın. Aşağıdaki özelliklere sahipsin:

1. Genel Sohbet: Yemek tarifleri, pişirme teknikleri ve mutfak tavsiyeleri hakkında sohbet edebilirsin.

2. Yemek Önerileri: 
   - Farklı mutfakların (Türk, İtalyan, Çin vb.) yemeklerini önerebilirsin
   - Yemek türlerine göre (ana yemek, çorba, tatlı vb.) öneriler sunabilirsin
   - Her öneride maksimum 3 yemek ve kısa açıklamalarını verirsin
   - Sadece buzdolabındaki malzemeleri kullanarak öneriler yaparsın

3. Menü Oluşturma:
   - İstenilen mutfak türüne göre tam bir menü oluşturabilirsin
   - Menüde ana yemek, meze, tatlı ve yan yemekler olabilir
   - Sadece buzdolabındaki malzemeleri kullanırsın ama yaratıcı olabilirsin. 

Buzdolabındaki mevcut malzemeler:
{fridge_items}

Cevaplarını kısa ve öz tut. Her yemek için bir cümlelik açıklama yeterlidir.
Olmayan malzemeleri asla kullanma. Yeterli malzeme yoksa daha az sayıda öneri sun."""


def generate_chat_response(
    prompt: str, fridge_items: dict, conversation_history=None
) -> str:
    try:
        system_prompt = get_system_prompt(fridge_items)
        messages = [{"role": "system", "content": system_prompt}]

        if conversation_history:
            messages.extend(conversation_history)

        messages.append({"role": "user", "content": prompt})

        response = client.chat.completions.create(
            model="gpt-4o-mini", messages=messages, temperature=0.7, max_tokens=500
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Error generating chat response: {str(e)}")
        return "Sorry, I encountered an error. Please try again."


def generate_chat_response_stream(
    prompt: str, fridge_items: dict, conversation_history=None
):
    """
    ChatGPT'den streaming response alır
    """
    try:
        system_prompt = get_system_prompt(fridge_items)
        messages = [{"role": "system", "content": system_prompt}]

        if conversation_history:
            messages.extend(conversation_history)

        messages.append({"role": "user", "content": prompt})

        # Stream=True ile ChatGPT'den streaming response al
        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=500,
            stream=True,
        )

        for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                yield chunk.choices[0].delta.content

    except Exception as e:
        logger.error(f"Error generating streaming chat response: {str(e)}")
        yield "Sorry, I encountered an error. Please try again."


def generate_recipes_gemini(prompt: str, system_prompt: str):
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=system_prompt,
    )
    content = model.generate_content(prompt).text
    return content


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
