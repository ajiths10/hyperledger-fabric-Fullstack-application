import {
  Context,
  Contract,
  Info,
  Returns,
  Transaction,
} from "fabric-contract-api";
import stringify from "json-stringify-deterministic";
import sortKeysRecursive from "sort-keys-recursive";
import { Cars } from "./entity";

@Info({
  title: "CarGarage",
  description: "Smart contract for trading Cars",
})
export class CarGarageContract extends Contract {
  constructor() {
    //Unique smart contract name when multiple contracts per chaincode
    super("CarGarageContract");
  }

  @Transaction()
  public async InitGarageCarLedger(ctx: Context): Promise<void> {
    const assets: Cars[] = [
      {
        ID: "assetcar1",
        Model: "Honda Accord",
        Color: "Silver",
        Owner: "Ajith",
        Year: 2023,
        VIN: "AB12CD345671",
        EngineType: "4-cylinder Diesel",
        Mileage: 10,
      },
      {
        ID: "assetcar2",
        Model: "Toyota Camry",
        Color: "White",
        Owner: "Emma",
        Year: 2019,
        VIN: "AB12CD345678",
        EngineType: "6-cylinder Petrol",
        Mileage: 11,
      },
    ];

    for (const asset of assets) {
      // example of how to write to world state deterministically
      // use convetion of alphabetic order
      // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
      // when retrieving data, in any lang, the order of data will be the same and consequently also the corresonding hash
      await ctx.stub.putState(
        asset.ID,
        Buffer.from(stringify(sortKeysRecursive(asset)))
      );
      console.info(`Asset ${asset.ID} initialized`);
    }
  }

  // CreateAsset issues a new asset to the world state with given details.
  @Transaction()
  public async CreateGarageCarAsset(ctx: Context, json: string): Promise<void> {
    const { ID, Model, Color, Owner, Year, VIN, EngineType, Mileage } =
      JSON.parse(json) as Cars;
    const exists = await this.AssetGarageCarExists(ctx, ID);
    if (exists) {
      throw new Error(`The asset ${ID} already exists`);
    }
    const asset = {
      ID: ID,
      Model: Model,
      Color: Color,
      Owner: Owner,
      Year: Year,
      VIN: VIN,
      EngineType: EngineType,
      Mileage: Mileage,
    };
    // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
    await ctx.stub.putState(
      ID,
      Buffer.from(stringify(sortKeysRecursive(asset)))
    );
  }

  // ReadAsset returns the asset stored in the world state with given id.
  @Transaction(false)
  public async ReadGarageCarAsset(ctx: Context, id: string): Promise<string> {
    const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
    if (assetJSON.length === 0) {
      throw new Error(`The asset ${id} does not exist`);
    }
    return assetJSON.toString();
  }

  // UpdateAsset updates an existing asset in the world state with provided parameters.
  @Transaction()
  public async UpdateGarageCarAsset(ctx: Context, json: string): Promise<void> {
    const { ID, Model, Color, Owner, Year, VIN, EngineType, Mileage } =
      JSON.parse(json) as Cars;
    const exists = await this.AssetGarageCarExists(ctx, ID);
    if (!exists) {
      throw new Error(`The asset ${ID} does not exist`);
    }

    // overwriting original asset with new asset
    const updatedAsset = {
      ID: ID,
      Model: Model,
      Color: Color,
      Owner: Owner,
      Year: Year,
      VIN: VIN,
      EngineType: EngineType,
      Mileage: Mileage,
    };
    // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
    return ctx.stub.putState(
      ID,
      Buffer.from(stringify(sortKeysRecursive(updatedAsset)))
    );
  }

  // DeleteAsset deletes an given asset from the world state.
  @Transaction()
  public async DeleteGarageCarAsset(ctx: Context, id: string): Promise<void> {
    const exists = await this.AssetGarageCarExists(ctx, id);
    if (!exists) {
      throw new Error(`The asset ${id} does not exist`);
    }
    return ctx.stub.deleteState(id);
  }

  // AssetExists returns true when asset with given ID exists in world state.
  @Transaction(false)
  @Returns("boolean")
  public async AssetGarageCarExists(
    ctx: Context,
    id: string
  ): Promise<boolean> {
    const assetJSON = await ctx.stub.getState(id);
    return assetJSON.length > 0;
  }

  // TransferAsset updates the owner field of asset with given id in the world state, and returns the old owner.
  @Transaction()
  public async TransferGarageCarAsset(
    ctx: Context,
    id: string,
    newOwner: string
  ): Promise<string> {
    const assetString = await this.ReadGarageCarAsset(ctx, id);
    const asset = JSON.parse(assetString) as Cars;
    const oldOwner = asset.Owner;
    asset.Owner = newOwner;
    // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
    await ctx.stub.putState(
      id,
      Buffer.from(stringify(sortKeysRecursive(asset)))
    );
    return oldOwner;
  }

  // GetAllGarageCars returns all assets found in the world state.
  @Transaction(false)
  @Returns("string")
  public async GetAllGarageCars(ctx: Context): Promise<string> {
    const allResults = [];
    // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString(
        "utf8"
      );
      let record;
      try {
        record = JSON.parse(strValue) as Cars;
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      allResults.push(record);
      result = await iterator.next();
    }
    return JSON.stringify(allResults);
  }

  // // GetHistoryForKey returns all assets history in the world state.
  // @Transaction(false)
  // @Returns("string")
  // public async GetHistoryForKey(ctx: Context, id: string): Promise<string> {
  //   const results: string[] = [];
  //   try {
  //     const historyIterator = await ctx.stub.getHistoryForKey(id);
  //     let result = await historyIterator.next();
  //     if (result.done) {
  //       const errorMessage = `Asset ${id} does not exist`;
  //       console.log(errorMessage);
  //       throw new Error(errorMessage);
  //     }

  //     while (!result.done) {
  //       const iteratorValue = Buffer.from(
  //         result.value.value.toString()
  //       ).toString("utf8");
  //       results.push(iteratorValue);
  //       console.log(iteratorValue);
  //       result = await historyIterator.next();
  //     }

  //     await historyIterator.close();
  //   } catch (error) {
  //     console.log(error);
  //   }
  //   return JSON.stringify(results);
  // }
}
