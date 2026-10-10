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

// src/handlers/flashSaleScheduler.ts
var flashSaleScheduler_exports = {};
__export(flashSaleScheduler_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(flashSaleScheduler_exports);

// src/services/flashSale.scheduler.service.ts
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

// src/services/flashSale.scheduler.service.ts
var FLASH_SALES_TABLE = process.env.FLASH_SALES_TABLE;
var PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
var STATUS_INDEX = "status-endAt-index";
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function isConditionalCheckFailed(error) {
  return error instanceof Error && error.name === "ConditionalCheckFailedException";
}
async function getSalesByStatus(status) {
  const sales = [];
  let ExclusiveStartKey;
  do {
    const result = await ddb.send(
      new import_lib_dynamodb2.QueryCommand({
        TableName: FLASH_SALES_TABLE,
        IndexName: STATUS_INDEX,
        KeyConditionExpression: "#status = :status",
        ExpressionAttributeNames: {
          "#status": "status"
        },
        ExpressionAttributeValues: {
          ":status": status
        },
        ExclusiveStartKey
      })
    );
    sales.push(
      ...result.Items ?? []
    );
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return sales;
}
async function activateProductFlashSale(sale) {
  await ddb.send(
    new import_lib_dynamodb2.UpdateCommand({
      TableName: PRODUCTS_TABLE,
      Key: {
        productId: sale.productId
      },
      UpdateExpression: `
                SET isFlashSale = :isFlashSale,
                    flashSaleId = :flashSaleId,
                    flashSalePrice = :flashSalePrice
            `,
      ExpressionAttributeValues: {
        ":isFlashSale": true,
        ":flashSaleId": sale.flashSaleId,
        ":flashSalePrice": sale.salePrice
      },
      ConditionExpression: `
                attribute_not_exists(flashSaleId)
                OR flashSaleId = :flashSaleId
            `
    })
  );
}
async function deactivateProductFlashSale(sale) {
  await ddb.send(
    new import_lib_dynamodb2.UpdateCommand({
      TableName: PRODUCTS_TABLE,
      Key: {
        productId: sale.productId
      },
      UpdateExpression: `
                REMOVE isFlashSale,
                       flashSaleId,
                       flashSalePrice
            `,
      ConditionExpression: "flashSaleId = :flashSaleId",
      ExpressionAttributeValues: {
        ":flashSaleId": sale.flashSaleId
      }
    })
  );
}
async function markFlashSaleActive(sale, updatedAt) {
  await ddb.send(
    new import_lib_dynamodb2.UpdateCommand({
      TableName: FLASH_SALES_TABLE,
      Key: {
        flashSaleId: sale.flashSaleId
      },
      UpdateExpression: `
                SET #status = :activeStatus,
                    updatedAt = :updatedAt
            `,
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":activeStatus": "ACTIVE",
        ":scheduledStatus": "SCHEDULED",
        ":updatedAt": updatedAt
      },
      ConditionExpression: "#status = :scheduledStatus"
    })
  );
}
async function activateDueFlashSales() {
  const now = nowIso();
  const scheduledSales = await getSalesByStatus("SCHEDULED");
  const dueSales = scheduledSales.filter(
    (sale) => sale.startAt <= now && sale.endAt > now
  );
  let activatedCount = 0;
  for (const sale of dueSales) {
    try {
      await activateProductFlashSale(sale);
      await markFlashSaleActive(
        sale,
        now
      );
      activatedCount++;
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        console.warn(
          `Flash sale ${sale.flashSaleId} was not activated because its state changed or the product is owned by another flash sale.`
        );
        continue;
      }
      console.error(
        `Failed to activate flash sale ${sale.flashSaleId}:`,
        error
      );
    }
  }
  return activatedCount;
}
async function expireMissedScheduledFlashSales() {
  const now = nowIso();
  const scheduledSales = await getSalesByStatus("SCHEDULED");
  const missedSales = scheduledSales.filter(
    (sale) => sale.endAt <= now
  );
  let expiredCount = 0;
  for (const sale of missedSales) {
    try {
      await deleteFlashSale(sale);
      expiredCount++;
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        console.warn(
          `Scheduled flash sale ${sale.flashSaleId} was already changed by another process.`
        );
        continue;
      }
      console.error(
        `Failed to expire missed flash sale ${sale.flashSaleId}:`,
        error
      );
    }
  }
  return expiredCount;
}
async function expireDueFlashSales() {
  const now = nowIso();
  const activeSales = await getSalesByStatus("ACTIVE");
  const expiredSales = activeSales.filter(
    (sale) => sale.endAt <= now
  );
  let expiredCount = 0;
  for (const sale of expiredSales) {
    try {
      try {
        await deactivateProductFlashSale(
          sale
        );
      } catch (error) {
        if (!isConditionalCheckFailed(
          error
        )) {
          throw error;
        }
        console.warn(
          `Product ${sale.productId} is no longer owned by flash sale ${sale.flashSaleId}. Skipping product cleanup.`
        );
      }
      await deleteFlashSale(sale);
      expiredCount++;
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        console.warn(
          `Active flash sale ${sale.flashSaleId} was already changed by another process.`
        );
        continue;
      }
      console.error(
        `Failed to expire flash sale ${sale.flashSaleId}:`,
        error
      );
    }
  }
  return expiredCount;
}
async function processFlashSales() {
  const missed = await expireMissedScheduledFlashSales();
  const activated = await activateDueFlashSales();
  const expired = await expireDueFlashSales();
  return {
    activated,
    expired,
    missed
  };
}
async function deleteFlashSale(sale) {
  await ddb.send(
    new import_lib_dynamodb2.DeleteCommand({
      TableName: FLASH_SALES_TABLE,
      Key: {
        flashSaleId: sale.flashSaleId
      },
      ConditionExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":status": sale.status
      }
    })
  );
}

// src/handlers/flashSaleScheduler.ts
var handler = async () => {
  try {
    const result = await processFlashSales();
    console.log(
      "Flash sale scheduler completed:",
      result
    );
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error(
      "Flash sale scheduler failed:",
      error
    );
    throw error;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=flashSaleScheduler.js.map
