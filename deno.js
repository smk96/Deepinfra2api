// DeepInfra API Dash Deno部署版本

// 环境检测
const isCloudflareWorkers = typeof addEventListener !== 'undefined' && typeof caches !== 'undefined';
const isDeno = typeof Deno !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

// 模型列表配置
const MODELS_LIST = {
  object: "list",
  data: [
    {
      "id": "openai/gpt-oss-120b",
      "object": "model",
      "created": 1700000000,
      "owned_by": "openai",
      "model_name": "openai/gpt-oss-120b",
      "display_name": "OpenAI GPT OSS 120B"
    },
    {
      "id": "moonshotai/Kimi-K2-Instruct",
      "object": "model",
      "created": 1700000000,
      "owned_by": "moonshotai",
      "model_name": "moonshotai/Kimi-K2-Instruct",
      "display_name": "Kimi K2"
    },
    {
      "id": "zai-org/GLM-4.5",
      "object": "model",
      "created": 1700000000,
      "owned_by": "zai-org",
      "model_name": "zai-org/GLM-4.5",
      "display_name": "GLM 4.5"
    },
    {
      "id": "Qwen/Qwen3-Coder-480B-A35B-Instruct-Turbo",
      "object": "model",
      "created": 1700000000,
      "owned_by": "Qwen",
      "model_name": "Qwen/Qwen3-Coder-480B-A35B-Instruct-Turbo",
      "display_name": "Qwen3 Coder Turbo"
    },
    {
      "id": "deepseek-ai/DeepSeek-R1-0528-Turbo",
      "object": "model",
      "created": 1700000000,
      "owned_by": "deepseek-ai",
      "model_name": "deepseek-ai/DeepSeek-R1-0528-Turbo",
      "display_name": "DeepSeek R1 0528 Turbo"
    },
    {
      "id": "deepseek-ai/DeepSeek-V3-0324-Turbo",
      "object": "model",
      "created": 1700000000,
      "owned_by": "deepseek-ai",
      "model_name": "deepseek-ai/DeepSeek-V3-0324-Turbo",
      "display_name": "DeepSeek V3 0324 Turbo"
    },
    {
      "id": "meta-llama/Llama-4-Maverick-17B-128E-Instruct-Turbo",
      "object": "model",
      "created": 1700000000,
      "owned_by": "meta-llama",
      "model_name": "meta-llama/Llama-4-Maverick-17B-128E-Instruct-Turbo",
      "display_name": "Llama 4 Maverick Turbo"
    }
  ]
};

// 通用请求头配置
const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
  "Accept": "text/event-stream",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Content-Type": "application/json",
  "sec-ch-ua-platform": "Windows",
  "X-Deepinfra-Source": "web-page",
  "sec-ch-ua": "\"Not(A:Brand\";v=\"99\", \"Microsoft Edge\";v=\"133\", \"Chromium\";v=\"133\"",
  "sec-ch-ua-mobile": "?0",
  "Origin": "https://deepinfra.com",
  "Sec-Fetch-Site": "same-site",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
  "Referer": "https://deepinfra.com/"
};

// CORS 响应头
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};

// 鉴权验证函数
function validateAuth(request, env) {
  const TOKEN = env?.TOKEN || (isDeno ? Deno.env.get("TOKEN") : process?.env?.TOKEN);
  if (!TOKEN) return true; // 如果没有设置 TOKEN，则跳过验证
  
  const authHeader = request.headers.get("Authorization");
  return authHeader && authHeader === `Bearer ${TOKEN}`;
}

// 创建错误响应
function createErrorResponse(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS
    }
  });
}

// 创建成功响应
function createSuccessResponse(data, contentType = "application/json") {
  return new Response(typeof data === 'string' ? data : JSON.stringify(data), {
    headers: {
      "Content-Type": contentType,
      ...CORS_HEADERS
    }
  });
}

// 主要请求处理函数
async function handleRequest(request, env = {}, ctx = {}) {
  const url = new URL(request.url);
  
  // 处理 CORS 预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: CORS_HEADERS
    });
  }

  // 处理 /v1/models 请求
  if (url.pathname === "/v1/models" && request.method === "GET") {
    // 鉴权验证
    if (!validateAuth(request, env)) {
      return createErrorResponse("Unauthorized", 401);
    }

    return createSuccessResponse(MODELS_LIST);
  }

  // 处理根路径健康检查
  if (url.pathname === "/" && request.method === "GET") {
    const healthInfo = {
      status: "ok",
      message: "DeepInfra API Proxy is running",
      timestamp: new Date().toISOString(),
      environment: isCloudflareWorkers ? "Cloudflare Workers" : isDeno ? "Deno" : "Node.js"
    };
    return createSuccessResponse(healthInfo);
  }

  // 只处理 POST 请求的聊天完成
  if (request.method !== "POST") {
    return createErrorResponse("Method not allowed", 405);
  }

  // 验证鉴权头
  if (!validateAuth(request, env)) {
    return createErrorResponse("Unauthorized", 401);
  }

  try {
    // 获取请求体
    const body = await request.json();

    // 发送请求到 DeepInfra API
    const response = await fetch("https://api.deepinfra.com/v1/openai/chat/completions", {
      method: "POST",
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(body)
    });

    // 构建响应
    const responseBody = response.body;
    const contentType = response.headers.get("Content-Type") || "application/json";

    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "Content-Type": contentType,
        ...CORS_HEADERS
      }
    });

  } catch (error) {
    console.error("请求处理错误:", error);
    return createErrorResponse(error.message);
  }
}

// 根据环境进行不同的导出和启动
if (isDeno) {
  // Deno 环境
  const PORT = parseInt(Deno.env.get("PORT") || "8000");
  
  console.log(`服务器启动中，端口: ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
  console.log(`模型接口: http://localhost:${PORT}/v1/models`);
  console.log(`对话接口: http://localhost:${PORT}/v1/chat/completions`);
  console.log(`运行环境: Deno`);
  
  Deno.serve({ port: PORT }, async (request) => {
    return await handleRequest(request, { TOKEN: Deno.env.get("TOKEN") });
  });
  
} else if (isNode) {
  // Node.js 环境
  const http = require('http');
  const url = require('url');
  const PORT = process.env.PORT || 3000;
  
  const server = http.createServer(async (req, res) => {
    // 构建 Request 对象（模拟 Fetch API）
    const fullUrl = `http://${req.headers.host}${req.url}`;
    let body = '';
    
    if (req.method === 'POST') {
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      await new Promise(resolve => {
        req.on('end', resolve);
      });
    }
    
    const request = {
      url: fullUrl,
      method: req.method,
      headers: {
        get: (name) => req.headers[name.toLowerCase()]
      },
      json: async () => body ? JSON.parse(body) : {}
    };
    
    try {
      const response = await handleRequest(request, { TOKEN: process.env.TOKEN });
      const responseText = await response.text();
      
      // 设置响应头
      Object.entries(response.headers || {}).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      res.statusCode = response.status || 200;
      res.end(responseText);
      
    } catch (error) {
      console.error('服务器错误:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error.message }));
    }
  });
  
  server.listen(PORT, () => {
    console.log(`服务器已启动，端口: ${PORT}`);
    console.log(`访问地址: http://localhost:${PORT}`);
    console.log(`模型接口: http://localhost:${PORT}/v1/models`);
    console.log(`对话接口: http://localhost:${PORT}/v1/chat/completions`);
    console.log(`运行环境: Node.js`);
  });
  
  // 导出模块
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { handleRequest, server };
  }
  
  } else {
    console.error('错误: 不支持的运行环境');
    console.error('请在 Cloudflare Workers、Deno 或 Node.js 环境中运行此脚本');
  }

// 导出配置（用于 Cloudflare Workers 和 ES 模块）
export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request, env, ctx);
  }
};
