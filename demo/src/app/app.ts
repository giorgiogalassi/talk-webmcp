import { Component } from '@angular/core';
import { ExpenseFormComponent } from './expenses/expense-form';
import { ExpenseListComponent } from './expenses/expense-list';
import { ExpenseSummaryComponent } from './expenses/expense-summary';
import { AgentActivityComponent } from './webmcp/agent-activity';

@Component({
  selector: 'app-root',
  imports: [ExpenseListComponent, ExpenseSummaryComponent, ExpenseFormComponent, AgentActivityComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
