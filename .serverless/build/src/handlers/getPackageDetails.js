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

// src/handlers/getPackageDetails.ts
var getPackageDetails_exports = {};
__export(getPackageDetails_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(getPackageDetails_exports);

// src/repo/getPackageDetails.repo.ts
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

// src/repo/getPackageDetails.repo.ts
var GetPackageDetailsRepository = class {
  async getPackageDetails(packageId) {
    const config = await ddb.send(
      new import_lib_dynamodb2.GetCommand({
        TableName: "AdminConfig",
        Key: {
          configId: "global"
        }
      })
    );
    const packageInfo = (config.Item?.packageTags || []).find(
      (x) => x.id === packageId
    );
    if (!packageInfo) {
      throw new Error(
        "Package not found"
      );
    }
    let lastKey;
    const products = [];
    do {
      const res = await ddb.send(
        new import_lib_dynamodb2.ScanCommand({
          TableName: "Products",
          ProjectionExpression: "productId, packageTagIds",
          ExclusiveStartKey: lastKey
        })
      );
      products.push(...res.Items || []);
      lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    const productIds = products.filter((p) => p.packageTagIds?.includes(packageId)).map((p) => p.productId);
    return {
      package: packageInfo,
      productIds
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
var PRODUCT_TABLE = process.env.PRODUCTS_TABLE;
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
        isBulkOnly: p.isBulkOnly || false,
        scheme1Price: p.scheme1Price || 0,
        scheme2Price: p.scheme2Price || 0,
        scheme3Price: p.scheme3Price || 0,
        scheme4Price: p.scheme4Price || 0
      };
    });
  }
  async deleteProduct(productId) {
    return this.repo.deleteProduct(productId);
  }
};

// src/services/getPackageDetails.service.ts
var GetPackageDetailsService = class {
  constructor(repo = new GetPackageDetailsRepository()) {
    this.repo = repo;
    this.productService = new ProductService();
  }
  async getPackageDetails(packageId) {
    const result = await this.repo.getPackageDetails(
      packageId
    );
    const items = await this.productService.batchGetProducts(
      result.productIds
    );
    const products = items.map(
      (p) => ({
        id: p.productId,
        name: p.name,
        image: p.image ?? null,
        price: p.price,
        originalPrice: p.originalPrice,
        discountText: p.discountText,
        categoryId: p.categoryId,
        brandId: p.brandId,
        qty: p.qty,
        searchText: p.searchText,
        isComboPackage: p.isComboPackage || false,
        sequenceNumber: p.sequenceNumber || 0,
        cartonQty: p.cartonQty || 0,
        isBulkOnly: p.isBulkOnly || false,
        scheme1Price: p.scheme1Price || 0,
        scheme2Price: p.scheme2Price || 0,
        scheme3Price: p.scheme3Price || 0,
        scheme4Price: p.scheme4Price || 0
      })
    );
    return {
      package: result.package,
      products
    };
  }
};

// src/handlers/getPackageDetails.ts
var service = new GetPackageDetailsService();
var handler = async (event) => {
  try {
    const packageId = event.pathParameters?.packageId;
    if (!packageId) {
      return {
        statusCode: 400,
        body: "packageId required"
      };
    }
    const data = await service.getPackageDetails(packageId);
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error(
      "GetPackageDetails error",
      err
    );
    return {
      statusCode: 500,
      body: "Internal Server Error"
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=getPackageDetails.js.map
