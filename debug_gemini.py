
import google.generativeai as genai
import inspect

print(f"GenAI Version: {genai.__version__}")

try:
    print("Available fields in Tool proto:")
    print(genai.protos.Tool.DESCRIPTOR.fields_by_name.keys())
except Exception as e:
    print(f"Could not inspect Tool proto: {e}")

try:
    t = genai.protos.Tool(google_search=genai.protos.GoogleSearch())
    print("Successfully created Tool with google_search")
except Exception as e:
    print(f"Failed to create Tool with google_search: {e}")

try:
    t = genai.protos.Tool(google_search_retrieval=genai.protos.GoogleSearchRetrieval())
    print("Successfully created Tool with google_search_retrieval")
except Exception as e:
    print(f"Failed to create Tool with google_search_retrieval: {e}")
