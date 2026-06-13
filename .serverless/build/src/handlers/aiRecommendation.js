"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/handlers/aiRecommendation.ts
var aiRecommendation_exports = {};
__export(aiRecommendation_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(aiRecommendation_exports);

// src/libs/response.ts
var success = (data, statusCode = 200) => ({
  statusCode,
  body: JSON.stringify({
    success: true,
    data
  })
});
var error = (message, statusCode = 400) => ({
  statusCode,
  body: JSON.stringify({
    success: false,
    message
  })
});

// src/constants/tagSynonyms.ts
var TAG_SYNONYMS = {
  child: "kids",
  children: "kids",
  kid: "kids",
  family: "family",
  adult: "adults",
  adults: "adults",
  silent: "low-noise",
  quiet: "low-noise",
  lownoise: "low-noise",
  mediumnoise: "medium-noise",
  loud: "high-noise",
  sound: "high-noise",
  eco: "eco-friendly",
  green: "eco-friendly",
  safe: "safe",
  affordable: "budget",
  cheap: "budget",
  luxury: "premium",
  premium: "premium",
  colourful: "colorful",
  colorful: "colorful",
  apartment: "apartment-friendly"
};

// src/parsers/regexIntentParser.ts
var RegexIntentParser = class {
  async parse(query) {
    const normalized = query.toLowerCase();
    const budgetMatch = normalized.match(/₹\s*(\d+)/i) || normalized.match(/rs\.?\s*(\d+)/i) || normalized.match(/under\s*(\d+)/i) || normalized.match(/below\s*(\d+)/i) || normalized.match(/budget\s*(\d+)/i) || normalized.match(/\b(\d{3,6})\b/);
    const budget = budgetMatch ? Number(budgetMatch[1]) : null;
    const tags = /* @__PURE__ */ new Set();
    Object.entries(TAG_SYNONYMS).forEach(
      ([keyword, tag]) => {
        if (normalized.includes(keyword)) {
          tags.add(tag);
        }
      }
    );
    const missingFields = [];
    if (!budget) {
      missingFields.push("budget");
    }
    return {
      budget,
      tags: Array.from(tags),
      missingFields
    };
  }
};

// src/repo/recommendation.repo.ts
var import_lib_dynamodb2 = require("@aws-sdk/lib-dynamodb");

// src/utils/dynamo.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var client = new import_client_dynamodb.DynamoDBClient({});
var ddb = import_lib_dynamodb.DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

// src/repo/recommendation.repo.ts
var PRODUCT_TABLE = process.env.PRODUCTS_TABLE;
var RecommendationRepository = class {
  async getAllActiveProducts() {
    const products = [];
    let lastKey = void 0;
    do {
      const res = await ddb.send(
        new import_lib_dynamodb2.QueryCommand({
          TableName: PRODUCT_TABLE,
          IndexName: "isActive-index",
          KeyConditionExpression: "isActive = :true",
          ProjectionExpression: "productId, price, quantity, categoryId, aiTags",
          ExpressionAttributeValues: {
            ":true": "true"
          },
          ExclusiveStartKey: lastKey
        })
      );
      console.log(
        "AI ACTIVE PRODUCTS FETCHED",
        products.length
      );
      products.push(...res.Items || []);
      lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    console.log(
      "AI TOTAL ACTIVE PRODUCTS",
      products.length
    );
    return products;
  }
};

// src/services/recommendation.service.ts
var MIN_AI_BUDGET = 3e3;
var MAX_AI_BUDGET = 5e4;
var MIN_MATCH_PERCENTAGE = 50;
var RecommendationService = class {
  constructor(repo = new RecommendationRepository()) {
    this.repo = repo;
  }
  async getRecommendations(intent) {
    if (!intent.budget) {
      return {
        status: "NEEDS_BUDGET",
        message: "Please provide your budget."
      };
    }
    if (intent.budget < MIN_AI_BUDGET) {
      return {
        status: "INVALID_BUDGET",
        message: `Minimum budget is \u20B9${MIN_AI_BUDGET}`
      };
    }
    const budget = Math.min(
      intent.budget,
      MAX_AI_BUDGET
    );
    if (!intent.tags?.length) {
      return {
        status: "SUCCESS",
        budget,
        exactMatchFound: false,
        candidates: []
      };
    }
    const requestedTags = intent.tags.map(
      (tag) => tag.toLowerCase().trim()
    );
    const products = await this.repo.getAllActiveProducts();
    console.log(
      "AI PRODUCTS FROM DB",
      products.length
    );
    const availableProducts = products.filter(
      (p) => p?.productId && Number(p.price || 0) > 0 && Number(p.quantity || 0) > 0
    );
    console.log(
      "AI AVAILABLE PRODUCTS",
      availableProducts.length
    );
    if (!intent.tags?.length) {
      return {
        status: "SUCCESS",
        budget,
        exactMatchFound: false,
        candidates: []
      };
    }
    const matchedProducts = availableProducts.map((product) => {
      const tags = Array.isArray(product.aiTags) ? product.aiTags.map(
        (tag) => tag.toLowerCase().trim()
      ) : [];
      const matchedTagCount = requestedTags.filter(
        (tag) => tags.includes(tag)
      ).length;
      const matchPercentage = matchedTagCount / requestedTags.length * 100;
      return {
        product,
        tags,
        matchedTagCount,
        matchPercentage
      };
    }).filter((item) => item.matchPercentage >= MIN_MATCH_PERCENTAGE);
    console.log(
      "AI MATCHED PRODUCTS",
      matchedProducts.length
    );
    if (matchedProducts.length) {
      console.log(
        "AI FIRST MATCH",
        JSON.stringify(
          matchedProducts[0]
        )
      );
    }
    const candidates = matchedProducts.map(
      (item) => {
        const product = item.product;
        const matchingTagCount = item.matchedTagCount;
        let score = 0;
        score += matchingTagCount * 20;
        if (matchingTagCount === requestedTags.length) {
          score += 100;
        }
        const stock = Number(product.quantity || 0);
        if (stock > 100) {
          score += 5;
        } else if (stock > 50) {
          score += 3;
        } else if (stock > 10) {
          score += 1;
        }
        return {
          productId: product.productId,
          categoryId: product.categoryId,
          price: Number(product.price),
          quantity: Number(product.quantity),
          score
        };
      }
    );
    console.log(
      "AI CANDIDATES",
      candidates.length
    );
    console.log(
      "AI TOP CANDIDATES",
      JSON.stringify(
        candidates.slice(0, 5)
      )
    );
    candidates.sort(
      (a, b) => b.score - a.score
    );
    return {
      status: "SUCCESS",
      budget,
      exactMatchFound: candidates.length > 0,
      candidates
    };
  }
};

// src/services/packageBuilder.service.ts
var MAX_ITERATIONS = 1e3;
var MAX_ADDITIONAL_PRODUCTS = 20;
var MAX_QTY_PER_PRODUCT = Number.isFinite(Number(process.env.MAX_AI_PRODUCT_QTY)) ? Number(process.env.MAX_AI_PRODUCT_QTY) : 10;
var PackageBuilderService = class {
  buildPackage(budget, candidates) {
    if (!candidates?.length) {
      return {
        total: 0,
        itemCount: 0,
        packageItems: [],
        additionalProductIds: []
      };
    }
    const validProducts = candidates.filter(
      (p) => p?.productId && Number(p.price || 0) > 0 && Number(p.quantity || 0) > 0
    );
    console.log(
      "AI VALID PRODUCTS",
      validProducts.length
    );
    if (!validProducts.length) {
      return {
        total: 0,
        itemCount: 0,
        packageItems: [],
        additionalProductIds: []
      };
    }
    const uniqueProducts = Array.from(
      new Map(
        validProducts.map(
          (p) => [p.productId, p]
        )
      ).values()
    );
    console.log(
      "AI UNIQUE PRODUCTS",
      uniqueProducts.length
    );
    uniqueProducts.sort(
      (a, b) => b.score - a.score
    );
    const affordableProducts = uniqueProducts.filter(
      (p) => Number(p.price) <= budget
    );
    console.log(
      "AI AFFORDABLE PRODUCTS",
      affordableProducts.length
    );
    console.log(
      "AI BUDGET",
      budget
    );
    if (!affordableProducts.length) {
      return {
        total: 0,
        itemCount: 0,
        packageItems: [],
        additionalProductIds: []
      };
    }
    const cheapestPrice = Math.min(
      ...affordableProducts.map(
        (p) => Number(p.price)
      )
    );
    if (!Number.isFinite(cheapestPrice) || cheapestPrice <= 0) {
      return {
        total: 0,
        itemCount: 0,
        packageItems: [],
        additionalProductIds: []
      };
    }
    const packageMap = /* @__PURE__ */ new Map();
    let total = 0;
    let iterations = 0;
    let added = true;
    while (added && iterations < MAX_ITERATIONS) {
      iterations++;
      added = false;
      if (budget - total < cheapestPrice) {
        break;
      }
      for (const product of affordableProducts) {
        console.log(
          "AI ADDING PRODUCT",
          product.productId,
          product.price
        );
        const existing = packageMap.get(
          product.productId
        );
        const currentQty = existing?.selectedQty || 0;
        if (currentQty >= Number(product.quantity)) {
          continue;
        }
        const maxAllowedQty = Math.min(
          Number(product.quantity),
          MAX_QTY_PER_PRODUCT
        );
        if (currentQty >= maxAllowedQty) {
          continue;
        }
        if (total + Number(product.price) > budget) {
          continue;
        }
        packageMap.set(
          product.productId,
          {
            productId: product.productId,
            selectedQty: currentQty + 1
          }
        );
        total += Number(product.price);
        added = true;
      }
    }
    const packageItems = Array.from(
      packageMap.values()
    );
    const packageIds = new Set(
      packageItems.map(
        (p) => p.productId
      )
    );
    const additionalProductIds = uniqueProducts.filter(
      (p) => !packageIds.has(
        p.productId
      )
    ).sort(
      (a, b) => b.score - a.score
    ).slice(
      0,
      MAX_ADDITIONAL_PRODUCTS
    ).map(
      (p) => p.productId
    );
    console.log(
      "AI PACKAGE ITEMS",
      JSON.stringify(packageItems)
    );
    console.log(
      "AI PACKAGE TOTAL",
      total
    );
    console.log(
      "AI ADDITIONAL PRODUCTS",
      additionalProductIds.length
    );
    return {
      total,
      itemCount: packageItems.reduce(
        (sum, item) => sum + item.selectedQty,
        0
      ),
      packageItems,
      additionalProductIds
    };
  }
};

// src/services/product.service.ts
var import_lib_dynamodb5 = require("@aws-sdk/lib-dynamodb");

// src/repo/product.repo.ts
var import_lib_dynamodb3 = require("@aws-sdk/lib-dynamodb");
var TABLE_NAME = process.env.PRODUCTS_TABLE;
var ProductRepository = class {
  async batchGet(productIds) {
    if (productIds.length === 0) return [];
    const keys = productIds.map((productId) => ({
      productId
    }));
    const res = await ddb.send(
      new import_lib_dynamodb3.BatchGetCommand({
        RequestItems: {
          [TABLE_NAME]: { Keys: keys }
        }
      })
    );
    return res.Responses?.[TABLE_NAME] ?? [];
  }
  async deleteProduct(productId) {
    await ddb.send(
      new import_lib_dynamodb3.DeleteCommand({
        TableName: process.env.PRODUCTS_TABLE,
        Key: { productId }
      })
    );
  }
};

// src/services/discount.service.ts
var import_lib_dynamodb4 = require("@aws-sdk/lib-dynamodb");
var DISCOUNT_TABLE = "Discounts";
async function getActiveDiscounts() {
  const res = await ddb.send(
    new import_lib_dynamodb4.ScanCommand({
      TableName: DISCOUNT_TABLE,
      FilterExpression: "isActive = :true",
      ExpressionAttributeValues: {
        ":true": true
      }
    })
  );
  return res.Items || [];
}

// src/services/price.service.ts
function applyDiscount(product, discounts) {
  let applied = null;
  applied = discounts.find(
    (d) => d.discountType === "PRODUCT" && d.targetId === product.productId
  ) || discounts.find(
    (d) => d.discountType === "CATEGORY" && d.targetId === product.categoryId
  ) || discounts.find(
    (d) => d.discountType === "BRAND" && d.targetId === product.brandId
  );
  if (!applied) {
    return {
      price: product.price,
      originalPrice: null,
      discountText: null
    };
  }
  let finalPrice = product.price;
  if (applied.discountMode === "PERCENT") {
    finalPrice = Math.round(
      product.price - product.price * applied.discountValue / 100
    );
  }
  if (applied.discountMode === "FLAT") {
    finalPrice = product.price - applied.discountValue;
  }
  return {
    price: finalPrice,
    originalPrice: product.price,
    discountText: applied.discountMode === "PERCENT" ? `${applied.discountValue}% OFF` : `\u20B9${applied.discountValue} OFF`
  };
}

// src/services/product.service.ts
var PRODUCT_TABLE2 = process.env.PRODUCTS_TABLE;
var ProductService = class {
  constructor(repo = new ProductRepository()) {
    this.repo = repo;
  }
  async batchGetProducts(productIds) {
    const uniqueIds = [...new Set(productIds)];
    if (uniqueIds.length > 100) {
      throw new Error("Too many products requested");
    }
    const products = await this.repo.batchGet(uniqueIds);
    if (!products || products.length === 0) return [];
    const discounts = await getActiveDiscounts();
    const productMap = new Map(products.map((p) => [p.productId, p]));
    return uniqueIds.map((id) => productMap.get(id)).filter((p) => Boolean(p)).filter((p) => p.isActive === "true" || p.isActive === true).map((p) => {
      const priceInfo = applyDiscount(p, discounts);
      return {
        productId: p.productId,
        name: p.name,
        description: p.description ?? null,
        image: p.imageUrls?.[0] ?? null,
        price: priceInfo.price,
        originalPrice: priceInfo.originalPrice > priceInfo.price ? priceInfo.originalPrice : void 0,
        discountText: priceInfo.discountText,
        categoryId: p.categoryId,
        brandId: p.brandId,
        qty: p.quantity
      };
    });
  }
  async deleteProduct(productId) {
    return this.repo.deleteProduct(productId);
  }
};

// src/repo/popularProducts.repo.ts
var import_lib_dynamodb6 = require("@aws-sdk/lib-dynamodb");
var ORDERS_TABLE = process.env.ORDERS_TABLE;
var PopularProductsRepository = class {
  constructor() {
    this.productService = new ProductService();
  }
  async getPopularProducts(limit) {
    let lastKey = void 0;
    const productCount = {};
    do {
      const res = await ddb.send(
        new import_lib_dynamodb6.QueryCommand({
          TableName: ORDERS_TABLE,
          IndexName: "status-meta-index",
          KeyConditionExpression: "#status = :s AND #meta = :m",
          ExpressionAttributeNames: {
            "#status": "status",
            "#meta": "meta"
          },
          ExpressionAttributeValues: {
            ":s": "DISPATCHED",
            ":m": "ORDER"
          },
          Limit: 50,
          ExclusiveStartKey: lastKey
        })
      );
      const orders = res.Items || [];
      for (const order of orders) {
        const items = order.items || [];
        for (const item of items) {
          const productId = item.productId;
          const qty = Number(item.quantity || 1);
          if (!productId) continue;
          productCount[productId] = (productCount[productId] || 0) + qty;
        }
      }
      lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    const topProductIds = Object.entries(productCount).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([productId]) => productId);
    if (topProductIds.length === 0) {
      return { items: [] };
    }
    const products = await this.productService.batchGetProducts(topProductIds);
    return {
      items: products
    };
  }
};

// src/services/popularProducts.service.ts
var PopularProductsService = class {
  constructor(repo = new PopularProductsRepository()) {
    this.repo = repo;
  }
  async getPopularProducts(input) {
    return this.repo.getPopularProducts(input.limit);
  }
};

// src/services/aiRecommendationOrchestrator.service.ts
var AiRecommendationOrchestratorService = class {
  constructor(parser = new RegexIntentParser(), recommendationService = new RecommendationService(), packageBuilder = new PackageBuilderService(), productService = new ProductService(), popularProductsService = new PopularProductsService()) {
    this.parser = parser;
    this.recommendationService = recommendationService;
    this.packageBuilder = packageBuilder;
    this.productService = productService;
    this.popularProductsService = popularProductsService;
  }
  async recommend(query) {
    const intent = await this.parser.parse(query);
    console.log(
      "AI INTENT",
      JSON.stringify(intent)
    );
    if (intent.missingFields.includes("budget")) {
      return {
        status: "NEEDS_BUDGET",
        message: "Please provide your budget so I can build a suitable cracker package.",
        extractedIntent: intent,
        quickBudgets: [
          3e3,
          5e3,
          1e4,
          2e4,
          5e4
        ]
      };
    }
    const recommendation = await this.recommendationService.getRecommendations(intent);
    console.log(
      "AI RECOMMENDATION RESULT",
      JSON.stringify(recommendation)
    );
    if (recommendation.status !== "SUCCESS") {
      return recommendation;
    }
    if (!recommendation.exactMatchFound || recommendation.candidates.length === 0) {
      return {
        status: "NO_MATCH_FOUND",
        message: "I couldn't find matching products for your request. Please tell me more about what you're looking for.",
        extractedIntent: intent,
        suggestedTags: [
          "kids",
          "family",
          "adults",
          "eco-friendly",
          "safe",
          "low-noise",
          "medium-noise",
          "high-noise",
          "premium",
          "budget",
          "colorful"
        ],
        recommendedPackage: {
          total: 0,
          itemCount: 0,
          items: []
        },
        additionalProducts: []
      };
    }
    const packageResult = this.packageBuilder.buildPackage(
      recommendation.budget,
      recommendation.candidates
    );
    console.log(
      "AI PACKAGE RESULT",
      JSON.stringify(packageResult)
    );
    if (packageResult.packageItems.length === 0) {
      return {
        status: "NO_PACKAGE_FOUND",
        message: "Couldn't build a package within your budget.",
        extractedIntent: intent,
        recommendedPackage: {
          total: 0,
          itemCount: 0,
          items: []
        },
        additionalProducts: []
      };
    }
    const packageProducts = await this.productService.batchGetProducts(
      packageResult.packageItems.map(
        (p) => p.productId
      )
    );
    console.log(
      "AI PACKAGE PRODUCTS",
      packageProducts.length
    );
    const qtyMap = new Map(
      packageResult.packageItems.map(
        (p) => [
          p.productId,
          p.selectedQty
        ]
      )
    );
    const packageItems = packageProducts.map(
      (p) => ({
        id: p.productId,
        name: p.name,
        image: p.image ?? null,
        price: p.price,
        originalPrice: p.originalPrice,
        discountText: p.discountText,
        categoryId: p.categoryId,
        brandId: p.brandId,
        qty: qtyMap.get(p.productId) || 1
      })
    );
    let additionalProducts = [];
    if (packageResult.additionalProductIds.length) {
      additionalProducts = await this.productService.batchGetProducts(packageResult.additionalProductIds);
      console.log(
        "AI ADDITIONAL PRODUCTS",
        additionalProducts.length
      );
    }
    if (additionalProducts.length < 10) {
      const { items } = await this.popularProductsService.getPopularProducts({
        limit: 10 - additionalProducts.length
      });
      const existingIds = new Set(
        additionalProducts.map(
          (p) => p.productId
        )
      );
      const packageIds = new Set(
        packageItems.map(
          (p) => p.id
        )
      );
      const filtered = items.filter(
        (p) => !existingIds.has(
          p.productId
        ) && !packageIds.has(
          p.productId
        )
      );
      additionalProducts.push(
        ...filtered
      );
    }
    const additionalItems = additionalProducts.map(
      (p) => ({
        id: p.productId,
        name: p.name,
        image: p.image ?? null,
        price: p.price,
        originalPrice: p.originalPrice,
        discountText: p.discountText,
        categoryId: p.categoryId,
        brandId: p.brandId,
        qty: p.qty
      })
    );
    return {
      status: "SUCCESS",
      extractedIntent: intent,
      recommendedPackage: {
        total: packageResult.total,
        itemCount: packageResult.itemCount,
        items: packageItems
      },
      additionalProducts: additionalItems
    };
  }
};

// src/handlers/aiRecommendation.ts
var service = new AiRecommendationOrchestratorService();
var handler = async (event) => {
  try {
    let body = {};
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch {
      return error(
        "Invalid request body",
        400
      );
    }
    const query = body?.query?.trim();
    if (!query) {
      return error(
        "Query is required",
        400
      );
    }
    if (query.length > 500) {
      return error(
        "Query is too long",
        400
      );
    }
    const result = await service.recommend(
      query
    );
    return success(result);
  } catch (err) {
    console.error(
      "AI Recommendation Error",
      err
    );
    return error(
      "Failed to generate recommendations",
      500
    );
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=aiRecommendation.js.map
