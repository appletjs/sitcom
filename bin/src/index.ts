import execute from './execute';
import program from 'commander';
import sitcom from 'sitcom';

program
  .version('0.1.0')
  .option('-c, --config [file]', 'Use this config file (if argument is used but value is unspecified, defaults to .sitcomrc.js)', '.sitcomrc.js')
  .option('-d, --dist [dir]', 'Output directory')
  // .option('-i, --input <file>', 'Input (alternative to <entry file>')
  .option('-o, --file <output>', 'Output (if absent, prints to stdout)')
  .option('--intro [string]', 'Content to insert at top of bundle (inside wrapper)')
  .option('--outro [string]', 'Content to insert at end of bundle (inside wrapper)')
  .option('--silent', 'Don\'t print warnings to the console.')
  .option('--declare [file]', 'Markdown referencing declaration.')
  .option('--root [dir]', 'Working directory.')
  .parse(process.argv);

execute(
  program,
  sitcom()
);
