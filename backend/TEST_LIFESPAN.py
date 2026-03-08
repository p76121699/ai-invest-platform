import asyncio
import sys
from contextlib import AsyncExitStack
from fastapi import FastAPI

try:
    from app.main import app
except Exception as e:
    print("Error importing app:")
    import traceback
    traceback.print_exc()
    sys.exit(1)

async def test_lifespan():
    print("Testing lifespan...")
    try:
        async with AsyncExitStack() as stack:
            await stack.enter_async_context(app.router.lifespan_context(app))
            print("Lifespan entered successfully!")
    except Exception as e:
        print("Error during lifespan:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_lifespan())
