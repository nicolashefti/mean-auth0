import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ApiService} from '../../core/api.service';

@Component({
  selector: 'app-order-confirmation',
  templateUrl: './order-confirmation.component.html',
  styleUrls: ['./order-confirmation.component.scss']
})
export class OrderConfirmationComponent implements OnInit {
  public orderId: string;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {

    this.route.queryParams.subscribe(params => {
      this.orderId = params['orderId'];
    });
  }

  ngOnInit() {
  }

  validateOrder() {
    console.log('Validate order');
    this.apiService.validateOrder(this.orderId).subscribe(
      data => {
        console.log(data)
      },
      err => {
        console.log(err)
      }
    );
  }
}
