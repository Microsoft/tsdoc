import * as React from 'react';
import * as tsdoc from '@microsoft/tsdoc';
import { TabPane } from './TabPane';

interface IPlaygroundViewProps {
}

interface IPlaygroundViewState {
  inputText: string;
  outputText: string;
  errorsText: string;
}

export class PlaygroundView extends React.Component<IPlaygroundViewProps, IPlaygroundViewState>  {
  private _reparseTimerHandle: number | undefined = undefined;
  private _reparseNeeded: boolean = true;

  constructor(props: IPlaygroundViewProps, context?: any) { // tslint:disable-line:no-any
    super(props, context);

    this.state = {
      inputText: require('raw-loader!./initialCode.ts'),
      outputText: '',
      errorsText: ''
    };
  }

  public componentDidMount(): void {
    this._reparseTimerHandle = setInterval(this._reparseTimer_onTick.bind(this), 700);
  }

  public componentWillUnmount(): void {
    if (this._reparseTimerHandle !== undefined) {
      clearInterval(this._reparseTimerHandle);
      this._reparseTimerHandle = undefined;
    }
  }

  public render(): React.ReactNode {

    const textAreasRowStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'stretch',
      height: '400px'
    };

    return (
      <div style={ { display: 'flex', flexDirection: 'column' } }>
        <div style={ textAreasRowStyle }>
          { this._renderInputBox() }

          <TabPane
            style={ { flex: 1, marginLeft: '4px' } }
            buttonRowStyle={ { height: '40px' } }
            tabs={ [
              { title: 'AST', render: this._renderAst.bind(this) },
              { title: 'HTML', render: this._renderHtml.bind(this) }
            ] }
          />
        </div>

        { this._renderErrorList() }
      </div>
    );
  }

  private _renderInputBox(): React.ReactNode {
    return (
      <div style={ { display: 'flex', flexDirection: 'column', flex: 1 } }>
        <div style={ { height: '40px' } } />
        <textarea
          id='input-textarea'
          style={ { width: '100%', height: '100%', boxSizing: 'border-box' } }
          value={ this.state.inputText }
          onChange={ this._inputTextArea_onChange.bind(this) }
          />
      </div>
    );
  }

  private _renderAst(): React.ReactNode {
    return (
      <textarea
        id='output-textarea'
        style={ { width: '100%', height: '100%', boxSizing: 'border-box' } }
        readOnly={ true }
        value={ this.state.outputText }
        />
    );
  }

  private _renderHtml(): React.ReactNode {
    return (
      <span> <b>HTML</b> goes here </span>
    );

  }

  private _renderErrorList(): React.ReactNode {
    const errorsTextAreaStyle: React.CSSProperties = {
      width: '1200px',
      height: '200px'
    };

    return (
      <div >
      Errors:
      <br />
      <textarea
        id='errors-textarea'
        readOnly={ true }
        value={ this.state.errorsText }
        style={ errorsTextAreaStyle }
        />
    </div>
    );
  }

  private _inputTextArea_onChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    this.setState({
      inputText: event.target.value
    });
    this._reparseNeeded = true;
  }

  private _reparseTimer_onTick(): void {
    if (!this._reparseNeeded) {
      return;
    }
    this._reparseNeeded = false;
    try {
      const inputText: string = this.state.inputText;
      const tsdocParser: tsdoc.TSDocParser = new tsdoc.TSDocParser();
      const parserContext: tsdoc.ParserContext = tsdocParser.parseString(inputText);

      const errorsText: string = parserContext.log.messages.map(x => x.toString()).join('\n');

      const outputLines: string[] = [];
      if (parserContext.docComment) {
        this._dumpTSDocTree(outputLines, parserContext.docComment);
      }

      this.setState({
        outputText: outputLines.join('\n'),
        errorsText
      });
    } catch (error) {
      this.setState({
        outputText: '',
        errorsText: 'Unhandled exception: ' + error.message
      });
    }
  }

  private _dumpTSDocTree(outputLines: string[], docNode: tsdoc.DocNode, indent: string = ''): void {
    let dumpText: string = `${indent}- ${docNode.kind}`;
    if (docNode instanceof tsdoc.DocNodeLeaf && docNode.excerpt) {
      const content: string = docNode.excerpt.content.toString();
      if (content.length > 0) {
        dumpText += ': ' + JSON.stringify(content);
      }
    }
    outputLines.push(dumpText);

    for (const child of docNode.getChildNodes()) {
      this._dumpTSDocTree(outputLines, child, indent + '  ');
    }
  }
}