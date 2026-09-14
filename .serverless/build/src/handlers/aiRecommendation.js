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
    let lastKey;
    do {
      const res = await ddb.send(
        new import_lib_dynamodb2.QueryCommand({
          TableName: PRODUCT_TABLE,
          IndexName: "isActive-index",
          KeyConditionExpression: "isActive = :true",
          ProjectionExpression: "productId, price, quantity, categoryId, brandId, aiTags, productFamily",
          ExpressionAttributeValues: {
            ":true": "true"
          },
          ExclusiveStartKey: lastKey
        })
      );
      products.push(...res.Items ?? []);
      console.log(
        "AI ACTIVE PRODUCTS FETCHED",
        products.length
      );
      lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    console.log(
      "AI TOTAL ACTIVE PRODUCTS",
      products.length
    );
    return products;
  }
};

// src/services/discount.service.ts
var import_lib_dynamodb3 = require("@aws-sdk/lib-dynamodb");
var DISCOUNT_TABLE = process.env.DISCOUNT_TABLE;
async function getActiveDiscounts() {
  const res = await ddb.send(
    new import_lib_dynamodb3.ScanCommand({
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
    finalPrice = Math.max(
      0,
      product.price - applied.discountValue
    );
  }
  return {
    price: finalPrice,
    originalPrice: product.price,
    discountText: applied.discountMode === "PERCENT" ? `${applied.discountValue}% OFF` : `\u20B9${applied.discountValue} OFF`
  };
}

// src/services/recommendationEngine.service.ts
var MAX_AI_BUDGET = 5e4;
var AI_WEIGHTS = {
  audience: 40,
  type: 40,
  noise: 20,
  time: 20,
  stock: 5,
  budget: 3
};
var RecommendationEngineService = class {
  constructor(repo = new RecommendationRepository()) {
    this.repo = repo;
  }
  async getRecommendations(request) {
    const budget = this.normalizeBudget(request.budget);
    const normalizedRequest = this.normalizeRequest({
      ...request,
      budget
    });
    const products = await this.repo.getAllActiveProducts();
    const discounts = await getActiveDiscounts();
    const discountedProducts = products.map((product) => {
      const priceInfo = applyDiscount(product, discounts);
      return {
        ...product,
        price: priceInfo.price,
        originalPrice: priceInfo.originalPrice,
        discountText: priceInfo.discountText
      };
    });
    console.log(
      "AI ACTIVE PRODUCTS",
      discountedProducts.length
    );
    const availableProducts = discountedProducts.filter(
      (product) => Boolean(product?.productId) && Number(product.price) > 0 && Number(product.quantity) > 0
    );
    if (!availableProducts.length) {
      return {
        status: "SUCCESS",
        budget,
        relaxationLevel: "IGNORE_TYPE",
        candidates: []
      };
    }
    const relaxationFlow = [
      "STRICT",
      "IGNORE_TIME",
      "IGNORE_NOISE",
      "IGNORE_TYPE"
    ];
    for (const level of relaxationFlow) {
      console.log(
        "AI RELAXATION LEVEL",
        level
      );
      const candidates = this.buildCandidates(
        availableProducts,
        normalizedRequest,
        level
      );
      if (candidates.length > 0) {
        console.log(
          "AI MATCH FOUND",
          level,
          candidates.length
        );
        return {
          status: "SUCCESS",
          budget,
          relaxationLevel: level,
          candidates
        };
      }
    }
    return {
      status: "SUCCESS",
      budget,
      relaxationLevel: "IGNORE_TYPE",
      candidates: []
    };
  }
  buildCandidates(products, request, level) {
    const candidates = [];
    for (const product of products) {
      const candidate = this.scoreProduct(
        product,
        request,
        level
      );
      if (candidate) {
        candidates.push(candidate);
      }
    }
    const unique = this.removeDuplicates(candidates);
    const sorted = this.sortCandidates(unique);
    this.logCandidateSummary(
      level,
      sorted
    );
    return sorted;
  }
  normalizeRequest(request) {
    return {
      budget: request.budget,
      audiences: this.normalizeArray(
        request.audiences
      ),
      crackerTypes: this.normalizeCrackerTypes(
        request.crackerTypes
      ),
      noiseLevels: this.normalizeNoiseLevels(
        request.noiseLevels
      ),
      timePreferences: this.normalizeTimePreferences(
        request.timePreferences
      ),
      features: []
    };
  }
  normalizeArray(values = []) {
    return Array.from(
      new Set(
        values.filter(Boolean).map(
          (value) => value.trim().toLowerCase()
        )
      )
    );
  }
  normalizeNoiseLevels(values = []) {
    const normalized = this.normalizeArray(values);
    if (!normalized.includes("both")) {
      return normalized;
    }
    return Array.from(
      /* @__PURE__ */ new Set([
        ...normalized.filter((value) => value !== "both"),
        "low",
        "high"
      ])
    );
  }
  normalizeTimePreferences(values = []) {
    const normalized = this.normalizeArray(values);
    if (!normalized.includes("both")) {
      return normalized;
    }
    return Array.from(
      /* @__PURE__ */ new Set([
        ...normalized.filter((value) => value !== "both"),
        "day",
        "night"
      ])
    );
  }
  normalizeCrackerTypes(values = []) {
    const normalized = this.normalizeArray(values);
    if (normalized.includes("mixed")) {
      return [];
    }
    return normalized;
  }
  normalizeBudget(budget) {
    const normalized = Number(budget);
    if (!Number.isFinite(normalized)) {
      return 0;
    }
    return Math.min(
      normalized,
      MAX_AI_BUDGET
    );
  }
  scoreProduct(product, request, level) {
    const tags = this.buildTagSet(product.aiTags);
    const audienceMatchCount = this.getMatchCount(
      tags,
      "audience",
      request.audiences
    );
    const matchedAudience = audienceMatchCount > 0;
    const typeMatchCount = this.getMatchCount(
      tags,
      "type",
      request.crackerTypes
    );
    const matchedType = typeMatchCount > 0;
    const noiseMatchCount = this.getMatchCount(
      tags,
      "noise",
      request.noiseLevels
    );
    const matchedNoise = noiseMatchCount > 0;
    const timeMatchCount = this.getMatchCount(
      tags,
      "time",
      request.timePreferences
    );
    const matchedTime = timeMatchCount > 0;
    if (!this.isEligible(
      level,
      request,
      matchedAudience,
      matchedType,
      matchedNoise,
      matchedTime
    )) {
      return null;
    }
    let score = 0;
    score += this.calculateCategoryScore(
      request.audiences.length,
      audienceMatchCount,
      AI_WEIGHTS.audience
    );
    score += this.calculateCategoryScore(
      request.crackerTypes.length,
      typeMatchCount,
      AI_WEIGHTS.type
    );
    score += this.calculateCategoryScore(
      request.noiseLevels.length,
      noiseMatchCount,
      AI_WEIGHTS.noise
    );
    score += this.calculateCategoryScore(
      request.timePreferences.length,
      timeMatchCount,
      AI_WEIGHTS.time
    );
    score += this.calculateStockBonus(
      Number(product.quantity)
    );
    score += this.calculateBudgetBonus(
      request.budget,
      Number(product.price)
    );
    return {
      productId: product.productId,
      categoryId: product.categoryId,
      price: Number(product.price),
      quantity: Number(product.quantity),
      productFamily: product.productFamily,
      score,
      aiTags: [...tags],
      matchedAudience,
      matchedType,
      matchedNoise,
      matchedTime
    };
  }
  isEligible(level, request, matchedAudience, matchedType, matchedNoise, matchedTime) {
    if (request.audiences.length && !matchedAudience) {
      return false;
    }
    if (request.crackerTypes.length && !matchedType) {
      return false;
    }
    if (level !== "IGNORE_NOISE" && level !== "IGNORE_TYPE") {
      if (request.noiseLevels.length && !matchedNoise) {
        return false;
      }
    }
    if (level === "STRICT") {
      if (request.timePreferences.length && !matchedTime) {
        return false;
      }
    }
    return true;
  }
  async getActiveProducts() {
    const products = await this.repo.getAllActiveProducts();
    const discounts = await getActiveDiscounts();
    return products.map((product) => {
      const priceInfo = applyDiscount(product, discounts);
      return {
        ...product,
        price: priceInfo.price,
        originalPrice: priceInfo.originalPrice,
        discountText: priceInfo.discountText
      };
    });
  }
  getMatchCount(tags, prefix, values) {
    if (!values.length) {
      return 0;
    }
    const matchValues = values;
    let count = 0;
    for (const value of matchValues) {
      if (tags.has(`${prefix}:${value}`)) {
        count++;
      }
    }
    return count;
  }
  buildTagSet(aiTags = []) {
    return new Set(
      aiTags.filter(Boolean).map(
        (tag) => tag.trim().toLowerCase()
      )
    );
  }
  calculateStockBonus(quantity) {
    if (quantity >= 100) {
      return AI_WEIGHTS.stock;
    }
    if (quantity >= 50) {
      return Math.floor(AI_WEIGHTS.stock * 0.6);
    }
    if (quantity >= 10) {
      return Math.floor(AI_WEIGHTS.stock * 0.2);
    }
    return 0;
  }
  calculateBudgetBonus(budget, productPrice) {
    if (budget <= 0 || productPrice <= 0) {
      return 0;
    }
    const ratio = productPrice / budget;
    if (ratio >= 0.05 && ratio <= 0.2) {
      return 3;
    }
    if (ratio > 0.2 && ratio <= 0.35) {
      return 2;
    }
    if (ratio > 0.35 && ratio <= 0.5) {
      return 1;
    }
    return 0;
  }
  calculateCategoryScore(totalSelections, matchedSelections, weight) {
    if (totalSelections === 0 || matchedSelections === 0) {
      return 0;
    }
    return Math.round(
      matchedSelections / totalSelections * weight
    );
  }
  logCandidateSummary(level, candidates) {
    console.log(
      "AI ENGINE SUMMARY",
      JSON.stringify({
        level,
        totalCandidates: candidates.length,
        topCandidates: candidates.slice(0, 5).map((candidate) => ({
          productId: candidate.productId,
          score: candidate.score,
          price: candidate.price,
          quantity: candidate.quantity
        }))
      })
    );
  }
  removeDuplicates(candidates) {
    const map = /* @__PURE__ */ new Map();
    for (const candidate of candidates) {
      const existing = map.get(candidate.productId);
      if (!existing) {
        map.set(
          candidate.productId,
          candidate
        );
        continue;
      }
      if (candidate.score > existing.score) {
        map.set(
          candidate.productId,
          candidate
        );
      }
    }
    return Array.from(map.values());
  }
  sortCandidates(candidates) {
    return candidates.sort(
      (a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        if (a.price !== b.price) {
          return b.price - a.price;
        }
        return b.quantity - a.quantity;
      }
    );
  }
};

// src/services/fallbackRecommendation.service.ts
var FallbackRecommendationService = class {
  buildCandidates(budget, products) {
    if (budget <= 0 || products.length === 0) {
      return [];
    }
    const candidates = products.filter(
      (product) => product.price > 0 && product.quantity > 0 && product.price <= budget
    ).sort((a, b) => {
      if (a.price !== b.price) {
        return b.price - a.price;
      }
      if (b.quantity !== a.quantity) {
        return b.quantity - a.quantity;
      }
      return a.productId.localeCompare(
        b.productId
      );
    }).map(
      (product) => this.toCandidate(
        product,
        budget
      )
    );
    console.log(
      "AI FALLBACK CANDIDATES",
      JSON.stringify({
        budget,
        candidates: candidates.length
      })
    );
    return candidates;
  }
  toCandidate(product, budget) {
    const utilization = product.price / budget;
    const score = utilization >= 0.5 ? 5 : utilization >= 0.3 ? 4 : utilization >= 0.15 ? 3 : utilization >= 0.05 ? 2 : 1;
    return {
      productId: product.productId,
      categoryId: product.categoryId,
      price: product.price,
      quantity: product.quantity,
      aiTags: product.aiTags ?? [],
      score,
      matchedAudience: false,
      matchedType: false,
      matchedNoise: false,
      matchedTime: false
    };
  }
};

// src/services/packageBuilder.service.ts
var MAX_AI_PRODUCT_QTY = Number.isFinite(
  Number(process.env.MAX_AI_PRODUCT_QTY)
) ? Number(process.env.MAX_AI_PRODUCT_QTY) : 10;
var MIN_OPTIMIZATION_POOL = 30;
var MAX_OPTIMIZATION_POOL = 300;
var PackageBuilderService = class {
  buildPackage(budget, candidates) {
    if (budget <= 0 || candidates.length === 0) {
      return this.emptyResult();
    }
    const rankedCandidates = this.prepareCandidates(budget, candidates);
    console.log("Prepared candidates:", rankedCandidates.length);
    if (rankedCandidates.length === 0) {
      return this.emptyResult();
    }
    const optimizationPool = this.buildOptimizationPool(
      budget,
      rankedCandidates
    );
    console.log("Optimization pool:", optimizationPool.length);
    const workingPackage = this.optimizePackage(
      budget,
      optimizationPool
    );
    console.log("After optimize:", workingPackage.items.size);
    this.fillRemainingBudget(
      budget,
      rankedCandidates,
      workingPackage
    );
    console.log("After fill:", workingPackage.items.size);
    this.expandQuantities(
      budget,
      rankedCandidates,
      workingPackage
    );
    console.log("After quantity expansion:", workingPackage.items.size);
    const packageItems = [...workingPackage.items.values()];
    const selectedIds = new Set(packageItems.map((item) => item.productId));
    const remainingCandidates = rankedCandidates.filter(
      (candidate) => !selectedIds.has(candidate.productId)
    );
    this.logPackageSummary(
      budget,
      workingPackage.total,
      packageItems,
      remainingCandidates.length
    );
    console.log("Final total:", workingPackage.total);
    return {
      total: workingPackage.total,
      itemCount: packageItems.reduce((sum, item) => sum + item.selectedQty, 0),
      packageItems,
      remainingCandidates
    };
  }
  emptyResult() {
    return {
      total: 0,
      itemCount: 0,
      packageItems: [],
      remainingCandidates: []
    };
  }
  prepareCandidates(budget, candidates) {
    const unique = /* @__PURE__ */ new Map();
    for (const candidate of candidates) {
      if (candidate.price <= 0 || candidate.quantity <= 0 || candidate.price > budget) {
        continue;
      }
      const existing = unique.get(candidate.productId);
      if (!existing || candidate.score > existing.score) {
        unique.set(candidate.productId, candidate);
      }
    }
    return [...unique.values()].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (a.price !== b.price) {
        return a.price - b.price;
      }
      return b.quantity - a.quantity;
    });
  }
  buildOptimizationPool(budget, candidates) {
    let poolSize = MIN_OPTIMIZATION_POOL;
    if (budget >= 5e3) {
      poolSize = 60;
    }
    if (budget >= 1e4) {
      poolSize = 90;
    }
    if (budget >= 2e4) {
      poolSize = MAX_OPTIMIZATION_POOL;
    }
    return candidates.slice(
      0,
      Math.min(poolSize, candidates.length)
    );
  }
  optimizePackage(budget, candidates) {
    let beamWidth = 25;
    let maxProductsPerCategory = 3;
    if (budget >= 1e4) {
      maxProductsPerCategory = 5;
    }
    if (budget >= 2e4) {
      maxProductsPerCategory = 8;
    }
    if (budget >= 5e3) {
      beamWidth = 40;
    }
    if (budget >= 1e4) {
      beamWidth = 60;
    }
    if (budget >= 2e4) {
      beamWidth = 100;
    }
    let beam = [
      {
        total: 0,
        score: 0,
        items: /* @__PURE__ */ new Map()
      }
    ];
    for (const candidate of candidates) {
      const nextBeam = [...beam];
      for (const current of beam) {
        if (current.items.has(candidate.productId)) {
          continue;
        }
        const categoryCount = [...current.items.keys()].map((id) => {
          const selected = candidates.find((c) => c.productId === id);
          return selected?.categoryId;
        }).filter((categoryId) => categoryId === candidate.categoryId).length;
        if (categoryCount >= maxProductsPerCategory) {
          continue;
        }
        const candidateFamily = candidate.productFamily?.trim().toLowerCase();
        if (candidateFamily) {
          const hasSameFamily = [...current.items.keys()].some((productId) => {
            const selected = candidates.find(
              (c) => c.productId === productId
            );
            return selected?.productFamily?.trim().toLowerCase() === candidateFamily;
          });
          if (hasSameFamily) {
            continue;
          }
        }
        if (current.total + candidate.price > budget) {
          continue;
        }
        const clone = this.cloneWorkingPackage(current);
        clone.items.set(
          candidate.productId,
          {
            productId: candidate.productId,
            selectedQty: 1
          }
        );
        clone.total += candidate.price;
        clone.score += candidate.score;
        nextBeam.push(clone);
      }
      const unique = /* @__PURE__ */ new Map();
      for (const pkg of nextBeam) {
        unique.set(
          this.packageKey(pkg),
          pkg
        );
      }
      beam = [...unique.values()].sort(
        (a, b) => this.packageValue(
          b,
          budget
        ) - this.packageValue(
          a,
          budget
        )
      ).slice(0, beamWidth);
    }
    const best = beam.sort(
      (a, b) => this.packageValue(b, budget) - this.packageValue(a, budget)
    )[0];
    return best;
  }
  packageValue(pkg, budget) {
    const utilization = pkg.total / budget;
    const uniqueProducts = pkg.items.size;
    return utilization * 3500 + pkg.score * 400 + uniqueProducts * 150;
  }
  cloneWorkingPackage(pkg) {
    return {
      total: pkg.total,
      score: pkg.score,
      items: new Map(
        [...pkg.items.entries()].map(([key, value]) => [
          key,
          {
            ...value
          }
        ])
      )
    };
  }
  packageKey(pkg) {
    return [...pkg.items.keys()].sort().join("|");
  }
  expandQuantities(budget, candidates, workingPackage) {
    while (true) {
      const remainingBudget = budget - workingPackage.total;
      if (remainingBudget <= 0) {
        break;
      }
      const candidate = this.findBestQuantityCandidate(
        remainingBudget,
        candidates,
        workingPackage
      );
      if (!candidate) {
        break;
      }
      const item = workingPackage.items.get(candidate.productId);
      item.selectedQty++;
      workingPackage.total += candidate.price;
      workingPackage.score += candidate.score;
    }
  }
  findBestNewCandidate(remainingBudget, candidates, workingPackage, budget) {
    const categoryCounts = /* @__PURE__ */ new Map();
    const selectedFamilies = /* @__PURE__ */ new Set();
    for (const item of workingPackage.items.values()) {
      const selected = candidates.find(
        (c) => c.productId === item.productId
      );
      if (!selected) {
        continue;
      }
      categoryCounts.set(
        selected.categoryId,
        (categoryCounts.get(selected.categoryId) ?? 0) + 1
      );
      const family = selected.productFamily?.trim().toLowerCase();
      if (family) {
        selectedFamilies.add(family);
      }
    }
    let bestCandidate;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const candidate of candidates) {
      if (workingPackage.items.has(candidate.productId)) {
        continue;
      }
      if (candidate.price > remainingBudget) {
        continue;
      }
      const family = candidate.productFamily?.trim().toLowerCase();
      if (family && selectedFamilies.has(family)) {
        continue;
      }
      const categoryCount = categoryCounts.get(candidate.categoryId) ?? 0;
      const leftover = remainingBudget - candidate.price;
      let priceBonus = 0;
      const utilization = candidate.price / budget;
      if (utilization >= 0.08 && utilization <= 0.2) {
        priceBonus = 2;
      }
      const utilizationBonus = candidate.price / remainingBudget;
      const adjustedScore = candidate.score - categoryCount + utilizationBonus * 2 + priceBonus + this.leftoverBudgetBonus(
        leftover,
        candidates,
        workingPackage
      );
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestCandidate = candidate;
      }
    }
    return bestCandidate;
  }
  leftoverBudgetBonus(leftover, candidates, workingPackage) {
    if (leftover <= 0) {
      return 0;
    }
    const cheapestRemaining = candidates.filter(
      (c) => !workingPackage.items.has(c.productId)
    ).reduce(
      (min, c) => Math.min(min, c.price),
      Number.MAX_SAFE_INTEGER
    );
    if (cheapestRemaining === Number.MAX_SAFE_INTEGER) {
      return 0;
    }
    if (leftover >= cheapestRemaining) {
      return 3;
    }
    return -3;
  }
  findBestQuantityCandidate(remainingBudget, candidates, workingPackage) {
    let bestCandidate;
    let bestScore = Number.NEGATIVE_INFINITY;
    const familyCounts = /* @__PURE__ */ new Map();
    for (const item of workingPackage.items.values()) {
      const selected = candidates.find(
        (c) => c.productId === item.productId
      );
      if (!selected?.productFamily) {
        continue;
      }
      familyCounts.set(
        selected.productFamily,
        (familyCounts.get(selected.productFamily) ?? 0) + 1
      );
    }
    for (const candidate of candidates) {
      if (!workingPackage.items.has(candidate.productId)) {
        continue;
      }
      if (candidate.price > remainingBudget) {
        continue;
      }
      if (!this.canIncreaseQuantity(candidate, workingPackage)) {
        continue;
      }
      const item = workingPackage.items.get(candidate.productId);
      const familyCount = candidate.productFamily ? familyCounts.get(candidate.productFamily) ?? 0 : 0;
      const quantityPenalty = item.selectedQty - 1;
      const dominancePenalty = Math.floor(item.selectedQty * item.selectedQty / 2);
      const FAMILY_PENALTY = 8;
      const adjustedScore = candidate.score - quantityPenalty - familyCount * FAMILY_PENALTY - dominancePenalty;
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestCandidate = candidate;
      }
    }
    return bestCandidate;
  }
  fillRemainingBudget(budget, candidates, workingPackage) {
    while (true) {
      const remainingBudget = budget - workingPackage.total;
      if (remainingBudget <= 0) {
        return;
      }
      const candidate = this.findBestNewCandidate(
        remainingBudget,
        candidates,
        workingPackage,
        budget
      );
      if (!candidate) {
        return;
      }
      workingPackage.items.set(candidate.productId, {
        productId: candidate.productId,
        selectedQty: 1
      });
      workingPackage.total += candidate.price;
      workingPackage.score += candidate.score;
    }
  }
  canIncreaseQuantity(candidate, workingPackage) {
    const item = workingPackage.items.get(candidate.productId);
    if (!item) {
      return false;
    }
    if (item.selectedQty >= candidate.quantity) {
      return false;
    }
    if (item.selectedQty >= MAX_AI_PRODUCT_QTY) {
      return false;
    }
    return true;
  }
  logPackageSummary(budget, total, packageItems, remainingCandidates) {
    console.log(
      "AI PACKAGE SUMMARY",
      JSON.stringify({
        budget,
        total,
        utilization: Number((total / budget * 100).toFixed(2)),
        uniqueProducts: packageItems.length,
        totalItems: packageItems.reduce(
          (sum, item) => sum + item.selectedQty,
          0
        ),
        remainingCandidates,
        packageItems
      })
    );
  }
};

// src/services/additionalRecommendation.service.ts
var DEFAULT_LIMIT = 10;
var AdditionalRecommendationService = class {
  getRecommendations(packageItems, remainingCandidates, limit = DEFAULT_LIMIT) {
    if (remainingCandidates.length === 0) {
      return [];
    }
    if (limit <= 0) {
      return [];
    }
    const packageIds = new Set(
      packageItems.map(
        (item) => item.productId
      )
    );
    const recommendations = [];
    for (const candidate of remainingCandidates) {
      if (packageIds.has(
        candidate.productId
      )) {
        continue;
      }
      recommendations.push(
        candidate.productId
      );
      if (recommendations.length >= limit) {
        break;
      }
    }
    this.logRecommendations(
      recommendations
    );
    return recommendations;
  }
  logRecommendations(recommendations) {
    console.log(
      "AI ADDITIONAL RECOMMENDATIONS",
      JSON.stringify({
        count: recommendations.length,
        recommendations
      })
    );
  }
};

// src/services/product.service.ts
var import_lib_dynamodb5 = require("@aws-sdk/lib-dynamodb");

// src/repo/product.repo.ts
var import_lib_dynamodb4 = require("@aws-sdk/lib-dynamodb");
var TABLE_NAME = process.env.PRODUCTS_TABLE;
var ProductRepository = class {
  async batchGet(productIds) {
    if (productIds.length === 0) return [];
    const keys = productIds.map((productId) => ({
      productId
    }));
    const res = await ddb.send(
      new import_lib_dynamodb4.BatchGetCommand({
        RequestItems: {
          [TABLE_NAME]: { Keys: keys }
        }
      })
    );
    return res.Responses?.[TABLE_NAME] ?? [];
  }
  async deleteProduct(productId) {
    await ddb.send(
      new import_lib_dynamodb4.DeleteCommand({
        TableName: process.env.PRODUCTS_TABLE,
        Key: { productId }
      })
    );
  }
};

// src/services/product.service.ts
var PRODUCT_TABLE2 = process.env.PRODUCTS_TABLE;
var ProductService = class {
  constructor(repo = new ProductRepository()) {
    this.repo = repo;
  }
  async batchGetProducts(productIds) {
    const uniqueIds = [...new Set(productIds)];
    const allProducts = [];
    for (let i = 0; i < uniqueIds.length; i += 100) {
      const chunk = uniqueIds.slice(i, i + 100);
      const products = await this.repo.batchGet(chunk);
      if (products?.length) {
        allProducts.push(...products);
      }
    }
    if (allProducts.length === 0) return [];
    const discounts = await getActiveDiscounts();
    const productMap = new Map(
      allProducts.map((p) => [p.productId, p])
    );
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
        qty: p.quantity,
        searchText: p.searchText,
        isComboPackage: p.isComboPackage || false,
        sequenceNumber: p.sequenceNumber || 0,
        cartonQty: p.cartonQty || 0,
        bulkOrderBasePrice: p.bulkOrderBasePrice || 0,
        isBulkOrderOnly: p.isBulkOrderOnly || false,
        isRetailOnly: p.isRetailOnly || false,
        packQuantity: p.packQuantity || 0,
        packUnit: p.packUnit || "",
        isGiftPack: p.isGiftPack || false
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
  constructor(fallbackRecommendationService = new FallbackRecommendationService(), recommendationEngine = new RecommendationEngineService(), packageBuilder = new PackageBuilderService(), additionalRecommendationService = new AdditionalRecommendationService(), productService = new ProductService(), popularProductsService = new PopularProductsService()) {
    this.fallbackRecommendationService = fallbackRecommendationService;
    this.recommendationEngine = recommendationEngine;
    this.packageBuilder = packageBuilder;
    this.additionalRecommendationService = additionalRecommendationService;
    this.productService = productService;
    this.popularProductsService = popularProductsService;
  }
  async recommend(request) {
    const recommendationResult = await this.recommendationEngine.getRecommendations(
      request
    );
    let recommendationCandidates = recommendationResult.candidates;
    if (recommendationCandidates.length === 0) {
      console.log(
        "AI NO MATCHES FOUND - USING FALLBACK RECOMMENDATION"
      );
      const activeProducts = await this.recommendationEngine.getActiveProducts();
      recommendationCandidates = this.fallbackRecommendationService.buildCandidates(
        recommendationResult.budget,
        activeProducts
      );
      console.log(
        "AI FALLBACK GENERATED",
        JSON.stringify({
          candidates: recommendationCandidates.length
        })
      );
    }
    const packageResult = this.packageBuilder.buildPackage(
      recommendationResult.budget,
      recommendationCandidates
    );
    const additionalProductIds = this.additionalRecommendationService.getRecommendations(
      packageResult.packageItems,
      packageResult.remainingCandidates,
      10
    );
    const packageProducts = await this.productService.batchGetProducts(
      packageResult.packageItems.map(
        (item) => item.productId
      )
    );
    const packageProductMap = new Map(
      packageProducts.map(
        (product) => [
          product.productId,
          product
        ]
      )
    );
    const packageItems = packageResult.packageItems.map((item) => {
      const product = packageProductMap.get(
        item.productId
      );
      if (!product) {
        return null;
      }
      return {
        id: product.productId,
        name: product.name,
        image: product.image ?? null,
        price: product.price,
        originalPrice: product.originalPrice,
        discountText: product.discountText,
        categoryId: product.categoryId,
        brandId: product.brandId,
        qty: item.selectedQty
      };
    }).filter(
      (item) => item !== null
    );
    let additionalProducts = [];
    if (additionalProductIds.length > 0) {
      additionalProducts = await this.productService.batchGetProducts(
        additionalProductIds
      );
    }
    if (additionalProducts.length < 10) {
      const { items } = await this.popularProductsService.getPopularProducts({
        limit: 10 - additionalProducts.length
      });
      console.log(
        "AI POPULAR PRODUCTS",
        JSON.stringify({
          count: items.length,
          ids: items.map((p) => p.productId)
        })
      );
      const existingIds = new Set(
        additionalProducts.map(
          (product) => product.productId
        )
      );
      const packageIds = new Set(
        packageItems.map(
          (item) => item.id
        )
      );
      const fallbackProducts = items.filter(
        (product) => !existingIds.has(
          product.productId
        ) && !packageIds.has(
          product.productId
        )
      );
      additionalProducts.push(
        ...fallbackProducts
      );
    }
    const additionalProductMap = new Map(
      additionalProducts.map(
        (product) => [
          product.productId,
          product
        ]
      )
    );
    const additionalItems = [
      ...additionalProductIds,
      ...additionalProducts.map(
        (product) => product.productId
      ).filter(
        (productId) => !additionalProductIds.includes(
          productId
        )
      )
    ].map((productId) => {
      const product = additionalProductMap.get(
        productId
      );
      if (!product) {
        return null;
      }
      return {
        id: product.productId,
        name: product.name,
        image: product.image ?? null,
        price: product.price,
        originalPrice: product.originalPrice,
        discountText: product.discountText,
        categoryId: product.categoryId,
        brandId: product.brandId,
        qty: product.qty
      };
    }).filter((item) => item !== null);
    return {
      status: "SUCCESS",
      budget: recommendationResult.budget,
      relaxationLevel: recommendationResult.relaxationLevel,
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
    let body;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch {
      return error(
        "Invalid request body",
        400
      );
    }
    const budget = Number(body.budget);
    if (!Number.isFinite(budget) || budget <= 0) {
      return error(
        "Budget is required",
        400
      );
    }
    body.budget = budget;
    body.audiences = Array.isArray(body.audiences) ? body.audiences : [];
    body.crackerTypes = Array.isArray(body.crackerTypes) ? body.crackerTypes : [];
    body.noiseLevels = Array.isArray(body.noiseLevels) ? body.noiseLevels : [];
    body.timePreferences = Array.isArray(body.timePreferences) ? body.timePreferences : [];
    body.features = Array.isArray(body.features) ? body.features : [];
    console.log(
      "AI Recommendation Request",
      {
        budget: body.budget,
        audiences: body.audiences,
        crackerTypes: body.crackerTypes,
        noiseLevels: body.noiseLevels,
        timePreferences: body.timePreferences,
        features: body.features
      }
    );
    const result = await service.recommend(body);
    return success(result);
  } catch (err) {
    console.error(
      "AI Recommendation Error",
      JSON.stringify(err, Object.getOwnPropertyNames(err))
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
