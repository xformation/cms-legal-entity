import _ from 'lodash';
import React, { PureComponent } from 'react';
import Highlighter from 'react-highlight-words';
import classnames from 'classnames';

import * as rangeUtil from 'app/core/utils/rangeutil';
import { RawTimeRange } from 'app/types/series';
import {
  LogsDedupStrategy,
  LogsModel,
  dedupLogRows,
  filterLogLevels,
  getParser,
  LogLevel,
  LogsMetaKind,
  LogsLabelStat,
  LogsParser,
  LogRow,
  calculateFieldStats,
} from 'app/core/logs_model';
import { findHighlightChunksInText } from 'app/core/utils/text';
import { Switch } from 'app/core/components/Switch/Switch';
import ToggleButtonGroup, { ToggleButton } from 'app/core/components/ToggleButtonGroup/ToggleButtonGroup';

import Graph from './Graph';
import LogLabels, { Stats } from './LogLabels';

const PREVIEW_LIMIT = 100;

const graphOptions = {
  series: {
    stack: true,
    bars: {
      show: true,
      lineWidth: 5,
      // barWidth: 10,
    },
    // stack: true,
  },
  yaxis: {
    tickDecimals: 0,
  },
};

/**
 * Renders a highlighted field.
 * When hovering, a stats icon is shown.
 */
const FieldHighlight = onClick => props => {
  return (
    <span className={props.className} style={props.style}>
      {props.children}
      <span className="logs-row__field-highlight--icon fa fa-signal" onClick={() => onClick(props.children)} />
    </span>
  );
};

interface RowProps {
  allRows: LogRow[];
  highlighterExpressions?: string[];
  row: LogRow;
  showDuplicates: boolean;
  showLabels: boolean | null; // Tristate: null means auto
  showLocalTime: boolean;
  showUtc: boolean;
  onClickLabel?: (label: string, value: string) => void;
}

interface RowState {
  fieldCount: number;
  fieldLabel: string;
  fieldStats: LogsLabelStat[];
  fieldValue: string;
  parsed: boolean;
  parser: LogsParser;
  parsedFieldHighlights: string[];
  showFieldStats: boolean;
}

/**
 * Renders a log line.
 *
 * When user hovers over it for a certain time, it lazily parses the log line.
 * Once a parser is found, it will determine fields, that will be highlighted.
 * When the user requests stats for a field, they will be calculated and rendered below the row.
 */
class Row extends PureComponent<RowProps, RowState> {
  mouseMessageTimer: NodeJS.Timer;

  state = {
    fieldCount: 0,
    fieldLabel: null,
    fieldStats: null,
    fieldValue: null,
    parsed: false,
    parser: null,
    parsedFieldHighlights: [],
    showFieldStats: false,
  };

  componentWillUnmount() {
    clearTimeout(this.mouseMessageTimer);
  }

  onClickClose = () => {
    this.setState({ showFieldStats: false });
  };

  onClickHighlight = (fieldText: string) => {
    const { allRows } = this.props;
    const { parser } = this.state;

    const fieldMatch = fieldText.match(parser.fieldRegex);
    if (fieldMatch) {
      // Build value-agnostic row matcher based on the field label
      const fieldLabel = fieldMatch[1];
      const fieldValue = fieldMatch[2];
      const matcher = parser.buildMatcher(fieldLabel);
      const fieldStats = calculateFieldStats(allRows, matcher);
      const fieldCount = fieldStats.reduce((sum, stat) => sum + stat.count, 0);

      this.setState({ fieldCount, fieldLabel, fieldStats, fieldValue, showFieldStats: true });
    }
  };

  onMouseOverMessage = () => {
    // Don't parse right away, user might move along
    this.mouseMessageTimer = setTimeout(this.parseMessage, 500);
  };

  onMouseOutMessage = () => {
    clearTimeout(this.mouseMessageTimer);
    this.setState({ parsed: false });
  };

  parseMessage = () => {
    if (!this.state.parsed) {
      const { row } = this.props;
      const parser = getParser(row.entry);
      if (parser) {
        // Use parser to highlight detected fields
        const parsedFieldHighlights = [];
        this.props.row.entry.replace(new RegExp(parser.fieldRegex, 'g'), substring => {
          parsedFieldHighlights.push(substring.trim());
          return '';
        });
        this.setState({ parsedFieldHighlights, parsed: true, parser });
      }
    }
  };

  render() {
    const {
      allRows,
      highlighterExpressions,
      onClickLabel,
      row,
      showDuplicates,
      showLabels,
      showLocalTime,
      showUtc,
    } = this.props;
    const {
      fieldCount,
      fieldLabel,
      fieldStats,
      fieldValue,
      parsed,
      parsedFieldHighlights,
      showFieldStats,
    } = this.state;
    const previewHighlights = highlighterExpressions && !_.isEqual(highlighterExpressions, row.searchWords);
    const highlights = previewHighlights ? highlighterExpressions : row.searchWords;
    const needsHighlighter = highlights && highlights.length > 0;
    const highlightClassName = classnames('logs-row__match-highlight', {
      'logs-row__match-highlight--preview': previewHighlights,
    });
    return (
      <div className="logs-row">
        {showDuplicates && (
          <div className="logs-row__duplicates">{row.duplicates > 0 ? `${row.duplicates + 1}x` : null}</div>
        )}
        <div className={row.logLevel ? `logs-row__level logs-row__level--${row.logLevel}` : ''} />
        {showUtc && (
          <div className="logs-row__time" title={`Local: ${row.timeLocal} (${row.timeFromNow})`}>
            {row.timestamp}
          </div>
        )}
        {showLocalTime && (
          <div className="logs-row__time" title={`${row.timestamp} (${row.timeFromNow})`}>
            {row.timeLocal}
          </div>
        )}
        {showLabels && (
          <div className="logs-row__labels">
            <LogLabels allRows={allRows} labels={row.uniqueLabels} onClickLabel={onClickLabel} />
          </div>
        )}
        <div className="logs-row__message" onMouseEnter={this.onMouseOverMessage} onMouseLeave={this.onMouseOutMessage}>
          {parsed && (
            <Highlighter
              autoEscape
              highlightTag={FieldHighlight(this.onClickHighlight)}
              textToHighlight={row.entry}
              searchWords={parsedFieldHighlights}
              highlightClassName="logs-row__field-highlight"
            />
          )}
          {!parsed &&
            needsHighlighter && (
              <Highlighter
                textToHighlight={row.entry}
                searchWords={highlights}
                findChunks={findHighlightChunksInText}
                highlightClassName={highlightClassName}
              />
            )}
          {!parsed && !needsHighlighter && row.entry}
          {showFieldStats && (
            <div className="logs-row__stats">
              <Stats
                stats={fieldStats}
                label={fieldLabel}
                value={fieldValue}
                onClickClose={this.onClickClose}
                rowCount={fieldCount}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
}

function renderMetaItem(value: any, kind: LogsMetaKind) {
  if (kind === LogsMetaKind.LabelsMap) {
    return (
      <span className="logs-meta-item__labels">
        <LogLabels labels={value} plain />
      </span>
    );
  }
  return value;
}

interface LogsProps {
  data: LogsModel;
  highlighterExpressions: string[];
  loading: boolean;
  position: string;
  range?: RawTimeRange;
  scanning?: boolean;
  scanRange?: RawTimeRange;
  onChangeTime?: (range: RawTimeRange) => void;
  onClickLabel?: (label: string, value: string) => void;
  onStartScanning?: () => void;
  onStopScanning?: () => void;
}

interface LogsState {
  dedup: LogsDedupStrategy;
  deferLogs: boolean;
  hiddenLogLevels: Set<LogLevel>;
  renderAll: boolean;
  showLabels: boolean | null; // Tristate: null means auto
  showLocalTime: boolean;
  showUtc: boolean;
}

export default class Logs extends PureComponent<LogsProps, LogsState> {
  deferLogsTimer: NodeJS.Timer;
  renderAllTimer: NodeJS.Timer;

  state = {
    dedup: LogsDedupStrategy.none,
    deferLogs: true,
    hiddenLogLevels: new Set(),
    renderAll: false,
    showLabels: null,
    showLocalTime: true,
    showUtc: false,
  };

  componentDidMount() {
    // Staged rendering
    if (this.state.deferLogs) {
      const { data } = this.props;
      const rowCount = data && data.rows ? data.rows.length : 0;
      // Render all right away if not too far over the limit
      const renderAll = rowCount <= PREVIEW_LIMIT * 2;
      this.deferLogsTimer = setTimeout(() => this.setState({ deferLogs: false, renderAll }), rowCount);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    // Staged rendering
    if (prevState.deferLogs && !this.state.deferLogs && !this.state.renderAll) {
      this.renderAllTimer = setTimeout(() => this.setState({ renderAll: true }), 2000);
    }
  }

  componentWillUnmount() {
    clearTimeout(this.deferLogsTimer);
    clearTimeout(this.renderAllTimer);
  }

  onChangeDedup = (dedup: LogsDedupStrategy) => {
    this.setState(prevState => {
      if (prevState.dedup === dedup) {
        return { dedup: LogsDedupStrategy.none };
      }
      return { dedup };
    });
  };

  onChangeLabels = (event: React.SyntheticEvent) => {
    const target = event.target as HTMLInputElement;
    this.setState({
      showLabels: target.checked,
    });
  };

  onChangeLocalTime = (event: React.SyntheticEvent) => {
    const target = event.target as HTMLInputElement;
    this.setState({
      showLocalTime: target.checked,
    });
  };

  onChangeUtc = (event: React.SyntheticEvent) => {
    const target = event.target as HTMLInputElement;
    this.setState({
      showUtc: target.checked,
    });
  };

  onToggleLogLevel = (rawLevel: string, hiddenRawLevels: Set<string>) => {
    const hiddenLogLevels: Set<LogLevel> = new Set(Array.from(hiddenRawLevels).map(level => LogLevel[level]));
    this.setState({ hiddenLogLevels });
  };

  onClickScan = (event: React.SyntheticEvent) => {
    event.preventDefault();
    this.props.onStartScanning();
  };

  onClickStopScan = (event: React.SyntheticEvent) => {
    event.preventDefault();
    this.props.onStopScanning();
  };

  render() {
    const {
      data,
      highlighterExpressions,
      loading = false,
      onClickLabel,
      position,
      range,
      scanning,
      scanRange,
    } = this.props;
    const { dedup, deferLogs, hiddenLogLevels, renderAll, showLocalTime, showUtc } = this.state;
    let { showLabels } = this.state;
    const hasData = data && data.rows && data.rows.length > 0;
    const showDuplicates = dedup !== LogsDedupStrategy.none;

    // Filtering
    const filteredData = filterLogLevels(data, hiddenLogLevels);
    const dedupedData = dedupLogRows(filteredData, dedup);
    const dedupCount = dedupedData.rows.reduce((sum, row) => sum + row.duplicates, 0);
    const meta = [...data.meta];
    if (dedup !== LogsDedupStrategy.none) {
      meta.push({
        label: 'Dedup count',
        value: dedupCount,
        kind: LogsMetaKind.Number,
      });
    }

    // Staged rendering
    const processedRows = dedupedData.rows;
    const firstRows = processedRows.slice(0, PREVIEW_LIMIT);
    const lastRows = processedRows.slice(PREVIEW_LIMIT);

    // Check for labels
    if (showLabels === null) {
      if (hasData) {
        showLabels = data.rows.some(row => _.size(row.uniqueLabels) > 0);
      } else {
        showLabels = true;
      }
    }

    // Grid options
    // const cssColumnSizes = [];
    // if (showDuplicates) {
    //   cssColumnSizes.push('max-content');
    // }
    // // Log-level indicator line
    // cssColumnSizes.push('3px');
    // if (showUtc) {
    //   cssColumnSizes.push('minmax(220px, max-content)');
    // }
    // if (showLocalTime) {
    //   cssColumnSizes.push('minmax(140px, max-content)');
    // }
    // if (showLabels) {
    //   cssColumnSizes.push('fit-content(20%)');
    // }
    // cssColumnSizes.push('1fr');
    // const logEntriesStyle = {
    //   gridTemplateColumns: cssColumnSizes.join(' '),
    // };

    const scanText = scanRange ? `Scanning ${rangeUtil.describeTimeRange(scanRange)}` : 'Scanning...';

    return (
      <div className="logs-panel">
        <div className="logs-panel-graph">
          <Graph
            data={data.series}
            height="100px"
            range={range}
            id={`explore-logs-graph-${position}`}
            onChangeTime={this.props.onChangeTime}
            onToggleSeries={this.onToggleLogLevel}
            userOptions={graphOptions}
          />
        </div>
        <div className="logs-panel-options">
          <div className="logs-panel-controls">
            <Switch label="Timestamp" checked={showUtc} onChange={this.onChangeUtc} small />
            <Switch label="Local time" checked={showLocalTime} onChange={this.onChangeLocalTime} small />
            <Switch label="Labels" checked={showLabels} onChange={this.onChangeLabels} small />
            <ToggleButtonGroup
              label="Dedup"
              onChange={this.onChangeDedup}
              value={dedup}
              render={({ selectedValue, onChange }) =>
                Object.keys(LogsDedupStrategy).map((dedupType, i) => (
                  <ToggleButton
                    className="btn-small"
                    key={i}
                    value={dedupType}
                    onChange={onChange}
                    selected={selectedValue === dedupType}
                  >
                    {dedupType}
                  </ToggleButton>
                ))
              }
            />
            {hasData &&
              meta && (
                <div className="logs-panel-meta">
                  {meta.map(item => (
                    <div className="logs-panel-meta__item" key={item.label}>
                      <span className="logs-panel-meta__label">{item.label}:</span>
                      <span className="logs-panel-meta__value">{renderMetaItem(item.value, item.kind)}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        <div className="logs-rows">
          {hasData &&
            !deferLogs &&
            // Only inject highlighterExpression in the first set for performance reasons
            firstRows.map(row => (
              <Row
                key={row.key + row.duplicates}
                allRows={processedRows}
                highlighterExpressions={highlighterExpressions}
                row={row}
                showDuplicates={showDuplicates}
                showLabels={showLabels}
                showLocalTime={showLocalTime}
                showUtc={showUtc}
                onClickLabel={onClickLabel}
              />
            ))}
          {hasData &&
            !deferLogs &&
            renderAll &&
            lastRows.map(row => (
              <Row
                key={row.key + row.duplicates}
                allRows={processedRows}
                row={row}
                showDuplicates={showDuplicates}
                showLabels={showLabels}
                showLocalTime={showLocalTime}
                showUtc={showUtc}
                onClickLabel={onClickLabel}
              />
            ))}
          {hasData && deferLogs && <span>Rendering {dedupedData.rows.length} rows...</span>}
        </div>
        {!loading &&
          !hasData &&
          !scanning && (
            <div className="logs-panel-nodata">
              No logs found.
              <a className="link" onClick={this.onClickScan}>
                Scan for older logs
              </a>
            </div>
          )}

        {scanning && (
          <div className="logs-panel-nodata">
            <span>{scanText}</span>
            <a className="link" onClick={this.onClickStopScan}>
              Stop scan
            </a>
          </div>
        )}
      </div>
    );
  }
}
