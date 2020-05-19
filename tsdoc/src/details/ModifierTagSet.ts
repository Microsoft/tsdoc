import { DocBlockTag } from '../nodes/DocBlockTag';
import { TSDocTagDefinition, TSDocTagSyntaxKind } from '../configuration/TSDocTagDefinition';
import { TSDocConfiguration } from '../configuration/TSDocConfiguration';

/**
 * Constructor parameters for {@link ModifierTagSet}.
 */
export interface IModifierTagSetParameters {
  configuration: TSDocConfiguration;
}

/**
 * Represents a set of modifier tags that were extracted from a doc comment.
 *
 * @remarks
 * TSDoc modifier tags are block tags that do not have any associated rich text content.
 * Instead, their presence or absence acts as an on/off switch, indicating some aspect
 * of the underlying API item.  For example, the `@internal` modifier indicates that a
 * signature is internal (i.e. not part of the public API contract).
 */
export class ModifierTagSet {
  public readonly configuration: TSDocConfiguration;

  private readonly _nodes: DocBlockTag[] = [];

  // NOTE: To implement case insensitivity, the keys in this set are always upper-case.
  // This convention makes the normalization more obvious (and as a general practice handles
  // the Turkish "i" character correctly).
  private readonly _nodesByName: Map<string, DocBlockTag> = new Map<string, DocBlockTag>();

  /**
   * Don't call this directly.  Instead use {@link TSDocParser}
   * @internal
   */
  public constructor(parameters: IModifierTagSetParameters) {
    this.configuration = parameters.configuration;
  }

  /**
   * The original block tag nodes that defined the modifiers in this set, excluding duplicates.
   */
  public get nodes(): ReadonlyArray<DocBlockTag> {
    return this._nodes;
  }

  /**
   * Returns true if the set contains a DocBlockTag with the specified tag name.
   * Note that synonyms are not considered.  The comparison is case-insensitive.
   * @param modifierTagName - The name of the tag, including the `@` prefix  For example, `@internal`
   */
  public hasTagName(modifierTagName: string): boolean {
    return this._nodesByName.has(modifierTagName.toUpperCase());
  }

  /**
   * Returns true if the set contains a DocBlockTag matching the specified tag definition.
   * The comparison is case-insensitive.  The TSDocTagDefinition must be a modifier tag.
   * @param tagName - The name of the tag, including the `@` prefix  For example, `@internal`
   */
  public hasTag(modifierTagDefinition: TSDocTagDefinition): boolean {
    return !!this.tryGetTag(modifierTagDefinition);
  }

  /**
   * Returns a DocBlockTag matching the specified tag definition, or undefined if no such
   * tag was added to the set.  If there were multiple instances, returned object will be
   * the first one to be added.
   */
  public tryGetTag(modifierTagDefinition: TSDocTagDefinition): DocBlockTag | undefined {
    if (modifierTagDefinition.syntaxKind !== TSDocTagSyntaxKind.ModifierTag) {
      throw new Error('The tag definition is not a modifier tag');
    }

    const configuredTagDefinition: TSDocTagDefinition
      = this.configuration.getConfiguredTagDefinition(modifierTagDefinition);

    let tag: DocBlockTag | undefined =
      this._nodesByName.get(configuredTagDefinition.tagNameWithUpperCase);
    if (!tag) {
      for (const synonym of configuredTagDefinition.synonymsWithUpperCase) {
        tag = this._nodesByName.get(synonym);
        if (tag) break;
      }
    }
    return tag;
  }

  /**
   * Adds a new modifier tag to the set.  If a tag already exists with the same name,
   * then no change is made, and the return value is false.
   */
  public addTag(blockTag: DocBlockTag): boolean {
    if (this._nodesByName.has(blockTag.tagNameWithUpperCase)) {
      return false;
    }

    this._nodesByName.set(blockTag.tagNameWithUpperCase, blockTag);
    this._nodes.push(blockTag);

    return true;
  }
}
