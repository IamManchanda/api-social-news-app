import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: EmailOptions) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: process.env.NODEMAILER_USERNAME,
      pass: process.env.NODEMAILER_PASSWORD,
    },
  });
  const info = await transporter.sendMail({
    from: '"Harry Manchanda" <harry@kibanu.com>',
    to,
    subject,
    html,
  });
  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
};

/**
 * Test Mail
  sendEmail({
    to: "receiver@mail.com",
    subject: "Hello, there!",
    html: `
          <h1>Greetings of the day!</h1>
          <p>
            How are you doing today? Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et mollitia, inventore delectus, dolore fugit soluta officia omnis qui dolorem impedit deserunt corrupti. Eveniet itaque, accusamus minima nam rerum assumenda sequi! Lorem, ipsum dolor sit amet consectetur adipisicing elit. Nihil cum accusamus nisi aperiam fuga in sapiente iure corporis iusto adipisci quam, officia perspiciatis placeat. Minus aut in voluptatum error ex!
          </p>
          <p>
            Lorem ipsum dolor, sit amet consectetur adipisicing elit. Dicta consequuntur, dolores sit totam tenetur libero corrupti? Ipsa hic ullam amet maiores ut at, nisi temporibus dolores ipsum eveniet, aut blanditiis sed accusantium atque veritatis libero. Iusto impedit ea, ducimus eligendi illo iure nisi voluptatem voluptatibus nam numquam excepturi minima. Eum?
          </p>
          <p>
            Lorem ipsum dolor, sit amet consectetur adipisicing elit. Asperiores laudantium porro nemo et autem molestiae non aut eos expedita earum provident repellat commodi, dignissimos, quibusdam adipisci. Recusandae eveniet odit inventore repudiandae amet fugit nam praesentium quis laudantium magni quod labore, ipsum non porro? Perferendis, amet ullam? Explicabo error aperiam tenetur numquam est corrupti expedita. Repellendus possimus omnis modi voluptate, in ab itaque blanditiis animi consequuntur beatae, ipsam neque asperiores tenetur.
          </p>
        `,
  });
*/
